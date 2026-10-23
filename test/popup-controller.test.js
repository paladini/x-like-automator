import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../popup/popup.js";

const { settingsErrorMessage } = globalThis.XLikesPolicy;

function field(value, checked = false) {
  const listeners = {};
  return {
    textContent: "",
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
    },
  }]);
});

test("start on a non-X tab sends no start message", async () => {
  const { elements, storage, tabs, messages } = harness({ url: "https://example.com/" });
  await createController({ storage, tabs, elements });
  await elements.start.click();
  assert.equal(messages.some((entry) => entry.message.type === "start"), false);
  assert.equal(elements.status.textContent, "Abra uma aba do X para iniciar.");
});

test("start on an X tab sends start through tabs.sendMessage", async () => {
  const { elements, storage, tabs, messages } = harness({ url: "https://x.com/home" });
  await createController({ storage, tabs, elements });
  await elements.start.click();
  assert.deepEqual(
    messages.filter((entry) => entry.message.type === "start"),
    [{ tabId: 7, message: { type: "start" } }],
  );
});

test("a synchronous send failure stays caught and asks for a reload", async () => {
  const { elements, storage, tabs } = harness({ url: "https://x.com/home" });
  tabs.sendMessage = () => {
    throw new TypeError("Unexpected property: 'type'");
  };
  await createController({ storage, tabs, elements });
  await elements.start.click();
  assert.equal(elements.status.textContent, "Recarregue a aba do X e toque em Iniciar de novo.");
});

test("a content script that does not answer asks for a reload", async () => {
  const { elements, storage, tabs } = harness({ url: "https://x.com/home" });
  tabs.sendMessage = async () => {
    throw new Error("Could not establish connection. Receiving end does not exist.");
  };
  await createController({ storage, tabs, elements });
  assert.equal(elements.status.textContent, "Recarregue a aba do X e toque em Iniciar de novo.");
});

test("the status node shows the spec sentence and the count prefix", async () => {
  const { elements, storage, tabs, listeners } = harness({
    session: { status: "paused_inactive", likeCount: 4 },
  });
  await createController({ storage, tabs, elements });
  assert.equal(elements.status.textContent, "Pausado: a aba do X não está ativa");
  assert.equal(elements.count.textContent, "Curtidas nesta sessão: 4");

  listeners[0]({
    session: { newValue: { status: "running", likeCount: 5 } },
  }, "session");
  assert.equal(elements.status.textContent, "Curtindo");
  assert.equal(elements.count.textContent, "Curtidas nesta sessão: 5");
});
