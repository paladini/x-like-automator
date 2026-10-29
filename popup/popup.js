// Wrapped in an IIFE: classic scripts share one global lexical scope, so
// top-level names here must not collide with lib/policy.js.
(function () {
const {
  SESSION_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  defaultSettings,
  settingsErrorMessage,
  popupView,
  validateSettings,
} = globalThis.XLikesPolicy;

function isXUrl(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "x.com" || host === "twitter.com";
  } catch {
    return false;
  }
}

function readForm(elements) {
  const capEmpty = elements.cap.value === "";
  return {
    intervalSeconds: elements.interval.valueAsNumber,
    capEnabled: elements.unlimited.checked !== true,
    cap: capEmpty ? "" : elements.cap.valueAsNumber,
    likeOriginalInReplyThread: elements.likeOriginal.checked === true,
    alsoRepost: elements.alsoRepost.checked === true,
    interfaceLanguage: elements.language.value,
  };
}

function paintSettings(elements, settings) {
  elements.interval.value = String(settings.intervalSeconds);
  elements.interval.valueAsNumber = settings.intervalSeconds;
  elements.unlimited.checked = settings.capEnabled !== true;
  elements.cap.value = String(settings.cap);
  elements.cap.valueAsNumber = settings.cap;
  elements.cap.disabled = settings.capEnabled !== true;
  elements.likeOriginal.checked = settings.likeOriginalInReplyThread !== false;
  elements.alsoRepost.checked = settings.alsoRepost !== false;
  elements.language.value = settings.interfaceLanguage || "pt-BR";
}

function paintSession(elements, session) {
  const view = popupView(session);
  applyView(elements, view);
  const likeCount = Number.isInteger(session?.likeCount) ? session.likeCount : 0;
  elements.count.textContent = `Curtidas nesta sessão: ${likeCount}`;
}

function applyView(elements, view) {
  const running = view.action === "stop";
  elements.status.textContent = view.status;
  elements.status.dataset.tone = view.tone;
  elements.start.hidden = running;
  elements.stop.hidden = !running;
  elements.stop.dataset.state = view.tone === "live" ? "running" : "idle";
  elements.start.setAttribute?.("aria-pressed", "false");
  elements.stop.setAttribute?.("aria-pressed", running ? "true" : "false");
}

async function enableSessionStorage(storage) {
  const open = storage.session?.setAccessLevel;
  if (typeof open !== "function") return;
  try {
    await open({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });
  } catch {
    // The popup can still write the session after the page replies.
  }
}

const NOT_X_STATUS = "Abra uma aba do X para iniciar.";
const RELOAD_STATUS = "Recarregue a aba do X e toque em Iniciar de novo.";

async function activeTab(tabs) {
  const tabsFound = await tabs.query({ active: true, currentWindow: true });
  return tabsFound[0] ?? null;
}

async function tell(tabsApi, tab, type) {
  if (!tab || !isXUrl(tab.url)) return { ok: false, reason: "not-x", session: null };
  try {
    const session = await tabsApi.sendMessage(tab.id, { type });
    return { ok: true, reason: null, session };
  } catch {
    return { ok: false, reason: "no-receiver", session: null };
  }
}

function showDeliveryProblem(elements, reason) {
  elements.error.textContent = "";
  applyView(elements, {
    action: "start",
    status: reason === "not-x" ? NOT_X_STATUS : RELOAD_STATUS,
    tone: "idle",
  });
}

function isSession(value) {
  return Boolean(value)
    && typeof value === "object"
    && typeof value.status === "string"
    && typeof value.running === "boolean";
}

async function rememberSession(storage, session) {
  if (typeof storage.session?.set !== "function") return;
  try {
    await storage.session.set({ [SESSION_STORAGE_KEY]: session });
  } catch {
    // The status already shows the reply from the page.
  }
}

async function createController({ storage, tabs, elements }) {
  let userActed = false;
  let confirmedRunning = false;
  let startInFlight = false;
  const opening = enableSessionStorage(storage);

  storage.onChanged.addListener((changes, area) => {
    if (area !== "session" || !changes[SESSION_STORAGE_KEY]) return;
    const next = changes[SESSION_STORAGE_KEY].newValue;
    if (next?.running === true) confirmedRunning = true;
    paintSession(elements, next);
  });

  elements.unlimited.addEventListener("change", () => {
    elements.cap.disabled = elements.unlimited.checked === true;
  });

  let epoch = 0;

  function giveUp(required, requireRunning, reason) {
    if (requireRunning && confirmedRunning) return false;
    if (!required && confirmedRunning) return false;
    showDeliveryProblem(elements, reason);
    return false;
  }

  async function deliver(type, { required = false, requireRunning = false } = {}) {
    const mine = ++epoch;
    let delivery;
    try {
      delivery = await tell(tabs, await activeTab(tabs), type);
    } catch {
      delivery = { ok: false, reason: "no-receiver", session: null };
    }
    if (mine !== epoch) return false;
    const showNotX = required && delivery.reason === "not-x";
    const showMiss = delivery.reason === "no-receiver" || (required && !isSession(delivery.session));
    if (!delivery.ok && (delivery.reason === "no-receiver" || showNotX)) {
      return giveUp(required, requireRunning, delivery.reason);
    }
    if (!isSession(delivery.session)) {
      if (showMiss) return giveUp(required, requireRunning, "no-receiver");
      return false;
    }
    if (requireRunning && delivery.session.running !== true) {
      return giveUp(required, requireRunning, "no-receiver");
    }
    if (delivery.session.running === true) confirmedRunning = true;
    paintSession(elements, delivery.session);
    await rememberSession(storage, delivery.session);
    return true;
  }

  elements.start.addEventListener("click", async () => {
    if (startInFlight) return;
    const result = validateSettings(readForm(elements));
    if (!result.ok) {
      elements.error.textContent = result.errors.map((code) => settingsErrorMessage(code)).join(" ");
      return;
    }
    elements.error.textContent = "";
    const countText = elements.count.textContent;
    userActed = true;
    confirmedRunning = false;
    startInFlight = true;
    paintSession(elements, { running: true, status: "running", likeCount: 0, stopReason: null });
    try {
      await opening;
      try {
        await storage.local.set({ [SETTINGS_STORAGE_KEY]: result.settings });
      } catch {
        showDeliveryProblem(elements, "no-receiver");
        elements.count.textContent = countText;
        return;
      }
      const started = await deliver("start", { required: true, requireRunning: true });
      if (!started && !confirmedRunning && elements.start.hidden === false) {
        elements.count.textContent = countText;
      }
    } finally {
      startInFlight = false;
    }
  });

  elements.stop.addEventListener("click", async () => {
    if (startInFlight) return;
    confirmedRunning = false;
    await deliver("stop", { required: true });
  });

  try {
    const stored = await storage.local.get(SETTINGS_STORAGE_KEY);
    const validated = validateSettings(stored[SETTINGS_STORAGE_KEY] ?? defaultSettings());
    const sessionStored = await storage.session.get(SESSION_STORAGE_KEY);
    if (!userActed) {
      paintSettings(elements, validated.ok ? validated.settings : defaultSettings());
      const savedSession = sessionStored[SESSION_STORAGE_KEY];
      if (savedSession?.running === true) confirmedRunning = true;
      paintSession(elements, savedSession);
    }
  } catch {
    if (!userActed) showDeliveryProblem(elements, "no-receiver");
  }

  await opening;
  await deliver("popup-open");

  return {
    async close() {
      const closed = await tell(tabs, await activeTab(tabs), "popup-close");
      if (!closed.ok && closed.reason === "no-receiver") showDeliveryProblem(elements, closed.reason);
    },
  };
}

function boot(chromeApi = globalThis.chrome, doc = globalThis.document) {
  const elements = {
    status: doc.getElementById("status"),
    count: doc.getElementById("count"),
    interval: doc.getElementById("interval"),
    unlimited: doc.getElementById("unlimited"),
    cap: doc.getElementById("cap"),
    likeOriginal: doc.getElementById("like-original"),
    alsoRepost: doc.getElementById("also-repost"),
    language: doc.getElementById("interface-language"),
    start: doc.getElementById("start"),
    stop: doc.getElementById("stop"),
    error: doc.getElementById("form-error"),
  };
  const controller = createController({
    storage: chromeApi.storage,
    tabs: chromeApi.tabs,
    elements,
  });
  globalThis.addEventListener?.("pagehide", () => {
    controller.then((ready) => ready.close());
  });
  return controller;
}

globalThis.XLikesPopup = { createController, boot };

if (typeof chrome !== "undefined" && chrome.runtime?.id && typeof document !== "undefined") {
  boot();
}
})();
