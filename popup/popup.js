import "../lib/ui-languages.js";
import "../lib/policy.js";

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
  elements.status.textContent = view.status;
  elements.status.dataset.tone = view.tone;
  elements.start.hidden = view.action !== "start";
  elements.stop.hidden = view.action !== "stop";
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

export async function createController({ storage, tabs, elements }) {
  try {
    const stored = await storage.local.get(SETTINGS_STORAGE_KEY);
    const validated = validateSettings(stored[SETTINGS_STORAGE_KEY] ?? defaultSettings());
    paintSettings(elements, validated.ok ? validated.settings : defaultSettings());
    const sessionStored = await storage.session.get(SESSION_STORAGE_KEY);
    paintSession(elements, sessionStored[SESSION_STORAGE_KEY]);
  } catch {
    showDeliveryProblem(elements, "no-receiver");
  }

  storage.onChanged.addListener((changes, area) => {
    if (area !== "session" || !changes[SESSION_STORAGE_KEY]) return;
    paintSession(elements, changes[SESSION_STORAGE_KEY].newValue);
  });

  elements.unlimited.addEventListener("change", () => {
    elements.cap.disabled = elements.unlimited.checked === true;
  });

  let epoch = 0;

  async function deliver(type, { required = false, requireRunning = false } = {}) {
    const mine = ++epoch;
    let delivery;
    try {
      delivery = await tell(tabs, await activeTab(tabs), type);
    } catch {
      delivery = { ok: false, reason: "no-receiver", session: null };
    }
    if (mine !== epoch) return;
    const showNotX = required && delivery.reason === "not-x";
    const showMiss = delivery.reason === "no-receiver" || (required && !isSession(delivery.session));
    if (!delivery.ok && (delivery.reason === "no-receiver" || showNotX)) {
      showDeliveryProblem(elements, delivery.reason);
      return;
    }
    if (!isSession(delivery.session)) {
      if (showMiss) showDeliveryProblem(elements, "no-receiver");
      return;
    }
    if (requireRunning && delivery.session.running !== true) {
      showDeliveryProblem(elements, "no-receiver");
      return;
    }
    paintSession(elements, delivery.session);
    await rememberSession(storage, delivery.session);
  }

  elements.start.addEventListener("click", async () => {
    const result = validateSettings(readForm(elements));
    if (!result.ok) {
      elements.error.textContent = result.errors.map((code) => settingsErrorMessage(code)).join(" ");
      return;
    }
    elements.error.textContent = "";
    try {
      await storage.local.set({ [SETTINGS_STORAGE_KEY]: result.settings });
    } catch {
      showDeliveryProblem(elements, "no-receiver");
      return;
    }
    await deliver("start", { required: true, requireRunning: true });
  });

  elements.stop.addEventListener("click", async () => {
    await deliver("stop", { required: true });
  });

  await deliver("popup-open");

  return {
    async close() {
      const closed = await tell(tabs, await activeTab(tabs), "popup-close");
      if (!closed.ok && closed.reason === "no-receiver") showDeliveryProblem(elements, closed.reason);
    },
  };
}

export function boot(chromeApi = globalThis.chrome, doc = globalThis.document) {
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

if (typeof chrome !== "undefined" && chrome.runtime?.id && typeof document !== "undefined") {
  boot();
}
