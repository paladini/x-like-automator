import {
  SESSION_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  defaultSettings,
  settingsErrorMessage,
  statusMessage,
  validateSettings,
} from "../lib/policy.js";

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
}

function paintSession(elements, session) {
  const status = session?.status ?? "stopped";
  const likeCount = Number.isInteger(session?.likeCount) ? session.likeCount : 0;
  elements.status.textContent = statusMessage(status);
  elements.count.textContent = `Curtidas nesta sessão: ${likeCount}`;
}

async function activeTab(tabs) {
  const tabsFound = await tabs.query({ active: true, currentWindow: true });
  return tabsFound[0] ?? null;
}

async function tell(runtime, tab, type) {
  if (!tab || !isXUrl(tab.url)) return;
  await runtime.sendMessage(tab.id, { type }).catch(() => {});
}

export async function createController({ storage, tabs, runtime, elements }) {
  const stored = await storage.local.get(SETTINGS_STORAGE_KEY);
  const validated = validateSettings(stored[SETTINGS_STORAGE_KEY] ?? defaultSettings());
  paintSettings(elements, validated.ok ? validated.settings : defaultSettings());

  const sessionStored = await storage.session.get(SESSION_STORAGE_KEY);
  paintSession(elements, sessionStored[SESSION_STORAGE_KEY]);

  storage.onChanged.addListener((changes, area) => {
    if (area !== "session" || !changes[SESSION_STORAGE_KEY]) return;
    paintSession(elements, changes[SESSION_STORAGE_KEY].newValue);
  });

  elements.unlimited.addEventListener("change", () => {
    elements.cap.disabled = elements.unlimited.checked === true;
  });

  elements.start.addEventListener("click", async () => {
    const result = validateSettings(readForm(elements));
    if (!result.ok) {
      elements.error.textContent = result.errors.map((code) => settingsErrorMessage(code)).join(" ");
      return;
    }
    elements.error.textContent = "";
    await storage.local.set({ [SETTINGS_STORAGE_KEY]: result.settings });
    await tell(runtime, await activeTab(tabs), "start");
  });

  elements.stop.addEventListener("click", async () => {
    await tell(runtime, await activeTab(tabs), "stop");
  });

  await tell(runtime, await activeTab(tabs), "popup-open");

  return {
    async close() {
      await tell(runtime, await activeTab(tabs), "popup-close");
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
    start: doc.getElementById("start"),
    stop: doc.getElementById("stop"),
    error: doc.getElementById("form-error"),
  };
  const controller = createController({
    storage: chromeApi.storage,
    tabs: chromeApi.tabs,
    runtime: chromeApi.runtime,
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
