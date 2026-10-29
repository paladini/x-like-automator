import assert from "node:assert/strict";
import test from "node:test";
import "../lib/ui-languages.js";
import "../lib/policy.js";
import "../popup/popup.js";

const { createController } = globalThis.XLikesPopup;

const { settingsErrorMessage } = globalThis.XLikesPolicy;

function field(value, checked = false) {
  const listeners = {};
  return {
    textContent: "",
    hidden: false,
    dataset: {},
    value: value === "" ? "" : String(value),
    valueAsNumber: value === "" ? Number.NaN : Number(value),
    checked,
    disabled: false,
    addEventListener(type, fn) {
      listeners[type] = fn;
    },
    click() {
      return listeners.click?.();
    },
  };
}

function harness({ url = "https://x.com/home", session, local } = {}) {
  const sets = [];
  const messages = [];
  const listeners = [];
  const elements = {
    status: field(""),
    count: field(""),
    interval: field(5),
    unlimited: field("", true),
    cap: field(100),
    likeOriginal: field("", true),
    alsoRepost: field("", true),
    language: field("pt-BR"),
    start: field(""),
    stop: field(""),
    error: field(""),
  };
  const storage = {
    sets,
    local: {
      async get(key) {
        return { [key]: local };
      },
      async set(value) {
        sets.push(value);
      },
    },
    session: {
      async get(key) {
        return { [key]: session };
      },
    },
    onChanged: {
      addListener(fn) {
        listeners.push(fn);
      },
    },
  };
  const tabs = {
    async query() {
      return [{ id: 7, url }];
    },
    async sendMessage(tabId, message) {
      messages.push({ tabId, message });
    },
  };
  return { elements, storage, tabs, sets, messages, listeners };
}

test("an invalid interval does not save and shows the spec sentence", async () => {
  const { elements, storage, tabs, sets, messages } = harness();
  await createController({ storage, tabs, elements });
  elements.interval.valueAsNumber = 0;
  await elements.start.click();
  assert.equal(sets.length, 0);
  assert.equal(elements.error.textContent, settingsErrorMessage("interval"));
  assert.equal(elements.error.textContent, "O intervalo precisa ser um número inteiro de 1 a 60.");
  assert.equal(messages.some((entry) => entry.message.type === "start"), false);
});

test("a valid form saves the validated settings", async () => {
  const { elements, storage, tabs, sets } = harness();
  await createController({ storage, tabs, elements });
  await elements.start.click();
  assert.deepEqual(sets, [{
    settings: {
      intervalSeconds: 5,
      capEnabled: false,
      cap: 100,
      likeOriginalInReplyThread: true,
      alsoRepost: true,
      interfaceLanguage: "pt-BR",
    },
  }]);
});

test("start on a non-X tab sends no start message", async () => {
  const { elements, storage, tabs, messages } = harness({ url: "https://example.com/" });
  await createController({ storage, tabs, elements });
  await elements.start.click();
  assert.equal(messages.some((entry) => entry.message.type === "start"), false);
  assert.equal(elements.status.textContent, "Abra uma aba do X para iniciar.");
  assert.equal(elements.start.hidden, false);
  assert.equal(elements.stop.hidden, true);
});

test("start on an X tab sends start through tabs.sendMessage", async () => {
  const { elements, storage, tabs, messages } = harness({ url: "https://x.com/home" });
  tabs.sendMessage = async (tabId, message) => {
    messages.push({ tabId, message });
    if (message.type === "start") {
      return { running: true, status: "running", likeCount: 0, stopReason: null };
    }
    return undefined;
  };
  await createController({ storage, tabs, elements });
  await elements.start.click();
  assert.deepEqual(
    messages.filter((entry) => entry.message.type === "start"),
    [{ tabId: 7, message: { type: "start" } }],
  );
  assert.equal(elements.status.textContent, "Curtindo");
  assert.equal(elements.status.dataset.tone, "live");
  assert.equal(elements.start.hidden, true);
  assert.equal(elements.stop.hidden, false);
});

test("a start reply with no session replaces Parado", async () => {
  const { elements, storage, tabs } = harness({ url: "https://x.com/home" });
  await createController({ storage, tabs, elements });
  assert.equal(elements.status.textContent, "Parado");
  await elements.start.click();
  assert.equal(elements.status.textContent, "Recarregue a aba do X e toque em Iniciar de novo.");
  assert.equal(elements.start.hidden, false);
  assert.equal(elements.stop.hidden, true);
});

test("a synchronous send failure stays caught and asks for a reload", async () => {
  const { elements, storage, tabs } = harness({ url: "https://x.com/home" });
  tabs.sendMessage = () => {
    throw new TypeError("Unexpected property: 'type'");
  };
  await createController({ storage, tabs, elements });
  await elements.start.click();
  assert.equal(elements.status.textContent, "Recarregue a aba do X e toque em Iniciar de novo.");
  assert.equal(elements.start.hidden, false);
  assert.equal(elements.stop.hidden, true);
});

test("a content script that does not answer asks for a reload", async () => {
  const { elements, storage, tabs } = harness({ url: "https://x.com/home" });
  tabs.sendMessage = async () => {
    throw new Error("Could not establish connection. Receiving end does not exist.");
  };
  await createController({ storage, tabs, elements });
  assert.equal(elements.status.textContent, "Recarregue a aba do X e toque em Iniciar de novo.");
});

test("start switches the button to Parar before the tab answers", async () => {
  const { elements, storage, tabs } = harness({ url: "https://x.com/home" });
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  tabs.sendMessage = async (_tabId, message) => {
    if (message.type === "start") {
      await gate;
      return { running: true, status: "running", likeCount: 0, stopReason: null };
    }
    return { running: false, status: "stopped", likeCount: 0, stopReason: null };
  };
  await createController({ storage, tabs, elements });
  const pending = elements.start.click();
  assert.equal(elements.status.textContent, "Curtindo");
  assert.equal(elements.status.dataset.tone, "live");
  assert.equal(elements.start.hidden, true);
  assert.equal(elements.stop.hidden, false);
  assert.equal(elements.stop.dataset.state, "running");
  release();
  await pending;
  assert.equal(elements.start.hidden, true);
  assert.equal(elements.stop.hidden, false);
});

test("a stored running session stays on Parar when the tab does not answer", async () => {
  const { elements, storage, tabs } = harness({
    url: "https://x.com/home",
    session: { running: true, status: "running", likeCount: 3, stopReason: null },
  });
  tabs.sendMessage = async () => {
    throw new Error("Could not establish connection. Receiving end does not exist.");
  };
  await createController({ storage, tabs, elements });
  assert.equal(elements.status.textContent, "Curtindo");
  assert.equal(elements.start.hidden, true);
  assert.equal(elements.stop.hidden, false);
  assert.equal(elements.stop.dataset.state, "running");
  assert.equal(elements.count.textContent, "Curtidas nesta sessão: 3");
});

test("a start already stored by the page stays on Parar when the reply is empty", async () => {
  const { elements, storage, tabs, listeners } = harness({ url: "https://x.com/home" });
  const writes = [];
  storage.session.set = async (value) => {
    writes.push(value);
  };
  tabs.sendMessage = async (_tabId, message) => {
    if (message.type === "start") {
      listeners[0]({
        session: { newValue: { status: "running", running: true, likeCount: 1, stopReason: null } },
      }, "session");
      return undefined;
    }
    return { running: false, status: "stopped", likeCount: 0, stopReason: null };
  };
  await createController({ storage, tabs, elements });
  const writesBeforeStart = writes.length;
  await elements.start.click();
  assert.equal(elements.status.textContent, "Curtindo");
  assert.equal(elements.start.hidden, true);
  assert.equal(elements.stop.hidden, false);
  assert.equal(elements.count.textContent, "Curtidas nesta sessão: 1");
  assert.equal(writes.length, writesBeforeStart);
});

test("opening the popup lets the page store the session", async () => {
  const { elements, storage, tabs } = harness({ url: "https://x.com/home" });
  const calls = [];
  storage.session.setAccessLevel = async (options) => {
    calls.push(options);
  };
  await createController({ storage, tabs, elements });
  assert.deepEqual(calls, [{ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" }]);
});

test("a confirmed start is stored for the next time the popup opens", async () => {
  const { elements, storage, tabs } = harness({ url: "https://x.com/home" });
  const writes = [];
  storage.session.set = async (value) => {
    writes.push(value);
  };
  tabs.sendMessage = async (_tabId, message) => {
    if (message.type === "start") {
      return { running: true, status: "running", likeCount: 2, stopReason: null };
    }
    return { running: false, status: "stopped", likeCount: 0, stopReason: null };
  };
  await createController({ storage, tabs, elements });
  await elements.start.click();
  assert.deepEqual(writes.at(-1), {
    session: { running: true, status: "running", likeCount: 2, stopReason: null },
  });
  assert.equal(elements.stop.hidden, false);
  assert.equal(elements.start.hidden, true);
});

test("the status node shows the spec sentence and the count prefix", async () => {
  const { elements, storage, tabs, listeners } = harness({
    session: { status: "paused_inactive", likeCount: 4 },
  });
  await createController({ storage, tabs, elements });
  assert.equal(elements.status.textContent, "Pausado");
  assert.equal(elements.status.dataset.tone, "paused");
  assert.equal(elements.start.hidden, true);
  assert.equal(elements.stop.hidden, false);
  assert.equal(elements.count.textContent, "Curtidas nesta sessão: 4");

  listeners[0]({
    session: { newValue: { status: "running", running: true, likeCount: 5 } },
  }, "session");
  assert.equal(elements.status.textContent, "Curtindo");
  assert.equal(elements.status.dataset.tone, "live");
  assert.equal(elements.start.hidden, true);
  assert.equal(elements.stop.hidden, false);
  assert.equal(elements.count.textContent, "Curtidas nesta sessão: 5");
});
