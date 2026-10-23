const POPUP_FOCUS_GRACE_MS = 200;
const SETTINGS_STORAGE_KEY = "settings";
const SESSION_STORAGE_KEY = "session";
const OBSERVE_WAIT_MS = 500;
const LOGIN_RECHECK_MS = 2000;
const UNSUPPORTED_RECHECK_MS = 2000;

const RESERVED_SEGMENTS = new Set([
  "home",
  "explore",
  "search",
  "settings",
  "messages",
  "notifications",
  "i",
  "compose",
  "login",
  "signup",
  "intent",
  "share",
  "tos",
  "privacy",
]);

const PROFILE_TABS = new Set(["with_replies", "likes", "media"]);

const STATUS_MESSAGES = {
  stopped: "Parado",
  running: "Curtindo",
  paused_inactive: "Pausado: a aba do X não está ativa",
  waiting_for_posts: "Aguardando novos posts",
  not_logged_in: "Entre no X nesta aba para começar",
  cap_reached: "Limite da sessão atingido",
  unsupported_page: "Esta página do X não entra na curtida automática",
};

const SETTINGS_ERRORS = {
  interval: "O intervalo precisa ser um número inteiro de 1 a 60.",
  cap: "O limite precisa ser um número inteiro de 1 a 1000000.",
};

const REFUSED_ACTIONS = new Set([
  "repost",
  "reply",
  "follow",
  "dm",
  "login",
  "collect_cookies",
]);

function allowedAction(action) {
  return action === "like" && !REFUSED_ACTIONS.has(action);
}

function defaultSettings() {
  return {
    intervalSeconds: 5,
    capEnabled: false,
    cap: 100,
    likeOriginalInReplyThread: true,
  };
}

function settingsErrorMessage(code) {
  return SETTINGS_ERRORS[code] ?? "";
}

function statusMessage(code) {
  return STATUS_MESSAGES[code] ?? STATUS_MESSAGES.stopped;
}

function validateSettings(input) {
  const source = input ?? {};
  const errors = [];
  const intervalSeconds = source.intervalSeconds;
  if (!Number.isInteger(intervalSeconds) || intervalSeconds < 1 || intervalSeconds > 60) {
    errors.push("interval");
  }

  const capEnabled = source.capEnabled === true;
  let cap = source.cap;
  if (!capEnabled && (cap === undefined || cap === null || cap === "" || !Number.isInteger(cap))) {
    cap = 100;
  }
  if (capEnabled && (!Number.isInteger(cap) || cap < 1 || cap > 1000000)) {
    errors.push("cap");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    settings: {
      intervalSeconds,
      capEnabled,
      cap,
      likeOriginalInReplyThread: source.likeOriginalInReplyThread !== false,
    },
  };
}

function nextDelayMs(intervalSeconds, randomUnit) {
  const unit = Math.min(1, Math.max(0, randomUnit));
  if (intervalSeconds === 1) return 1000;
  const raw = Math.round(intervalSeconds * 1000 * (0.85 + 0.15 * unit));
  return Math.min(intervalSeconds * 1000, Math.max(1000, raw));
}

function capDecision(likeCount, settings) {
  if (!settings.capEnabled) return { reached: false };
  return { reached: likeCount >= settings.cap };
}

function canStart({ tabIsX, settingsOk }) {
  return tabIsX === true && settingsOk === true;
}

function startSession() {
  return {
    running: true,
    likeCount: 0,
    seenIds: [],
    stopReason: null,
    status: "running",
    backoffStep: 0,
  };
}

function stopSession(session) {
  return {
    ...session,
    running: false,
    stopReason: "user",
    status: "stopped",
    backoffStep: 0,
  };
}

function activityDecision({ documentVisible, popupOpen, windowFocused, tabActive }) {
  if (!documentVisible) return "pause";
  if (popupOpen) return "run";
  if (!windowFocused || !tabActive) return "pause";
  return "run";
}

function blurPauseDelayMs({ becameHidden, popupOpen }) {
  if (becameHidden) return 0;
  if (popupOpen) return null;
  return POPUP_FOCUS_GRACE_MS;
}

function classifySurface(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return "other";
  }
  const host = url.hostname.toLowerCase();
  if (host !== "x.com" && host !== "twitter.com") return "other";

  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/home") return "home";
  if (path === "/search") return "search";
  if (/\/status\/\d+/.test(path)) return "status";

  const parts = path.split("/").filter(Boolean);
  const handle = parts[0] ?? "";
  const handleOk = /^[A-Za-z0-9_]{1,15}$/.test(handle) && !RESERVED_SEGMENTS.has(handle.toLowerCase());
  if (handleOk && parts.length === 1) return "profile";
  if (handleOk && parts.length === 2 && PROFILE_TABS.has(parts[1])) return "profile";
  return "other";
}

function annotateThread(posts, surface) {
  if (surface !== "status" || !posts.some((post) => post.isReply)) {
    return posts.map((post) => ({ ...post, role: "post" }));
  }
  const firstOriginal = posts.findIndex((post) => !post.isReply);
  const originalIndex = firstOriginal === -1 ? 0 : firstOriginal;
  return posts.map((post, index) => ({
    ...post,
    role: index === originalIndex ? "original" : "reply",
  }));
}

function selectNextLike(posts, seenIds, likeOriginal) {
  for (const post of posts) {
    if (typeof post.id !== "string" || !/^\d+$/.test(post.id)) continue;
    if (post.liked === true) continue;
    if (seenIds.includes(post.id)) continue;
    if (post.role === "original" && likeOriginal === false) continue;
    return { id: post.id };
  }
  return null;
}

function chooseScrollTarget({ documentScrollable, columnScrollable }) {
  if (documentScrollable) return "document";
  if (columnScrollable) return "column";
  return "none";
}

function scrollDecision({
  eligibleCount,
  attemptedScroll,
  beforeScrollY,
  afterScrollY,
  previousIds,
  currentIds,
  backoffStep,
}) {
  const advanced = afterScrollY > beforeScrollY + 1;
  const newPosts = currentIds.some((id) => !previousIds.includes(id));
  if (eligibleCount > 0) {
    return { action: "like_available", nextBackoffStep: 0, waitMs: 0 };
  }
  if (!attemptedScroll && (advanced || newPosts)) {
    return { action: "observe", nextBackoffStep: 0, waitMs: OBSERVE_WAIT_MS };
  }
  if (!attemptedScroll) {
    return { action: "scroll", nextBackoffStep: backoffStep, waitMs: 0 };
  }
  if (advanced || newPosts) {
    return { action: "observe", nextBackoffStep: 0, waitMs: OBSERVE_WAIT_MS };
  }
  const waitMs = Math.min(30000, 2000 * 2 ** backoffStep);
  return { action: "wait", nextBackoffStep: backoffStep + 1, waitMs };
}

function planTick(state) {
  const session = state.session;
  if (!session.running) {
    return {
      action: "idle",
      status: session.stopReason === "cap" ? "cap_reached" : "stopped",
      waitMs: 0,
    };
  }

  const activity = activityDecision(state);
  if (activity === "pause") {
    return { action: "pause", status: "paused_inactive", waitMs: 0 };
  }
  if (state.loginWall) {
    return { action: "block_login", status: "not_logged_in", waitMs: LOGIN_RECHECK_MS };
  }
  if (capDecision(session.likeCount, state.settings).reached) {
    return { action: "stop_cap", status: "cap_reached", waitMs: 0 };
  }

  const surface = classifySurface(state.url);
  if (surface === "other") {
    return { action: "skip_surface", status: "unsupported_page", waitMs: UNSUPPORTED_RECHECK_MS };
  }

  const annotated = annotateThread(state.posts, surface);
  const next = selectNextLike(annotated, session.seenIds, state.settings.likeOriginalInReplyThread);
  if (next) {
    return {
      action: "like",
      status: "running",
      waitMs: nextDelayMs(state.settings.intervalSeconds, state.randomUnit),
      postId: next.id,
    };
  }

  const decision = scrollDecision({
    eligibleCount: 0,
    attemptedScroll: state.scroll.attemptedScroll,
    beforeScrollY: state.scroll.beforeScrollY,
    afterScrollY: state.scroll.afterScrollY,
    previousIds: state.scroll.previousIds,
    currentIds: state.scroll.currentIds,
    backoffStep: session.backoffStep,
  });
  if (decision.action === "scroll") {
    const target = chooseScrollTarget(
      state.scrollTarget ?? { documentScrollable: true, columnScrollable: false },
    );
    if (target === "none") {
      const stalled = scrollDecision({
        eligibleCount: 0,
        attemptedScroll: true,
        beforeScrollY: state.scroll.beforeScrollY,
        afterScrollY: state.scroll.beforeScrollY,
        previousIds: state.scroll.previousIds,
        currentIds: state.scroll.currentIds,
        backoffStep: session.backoffStep,
      });
      return {
        action: "wait",
        status: "waiting_for_posts",
        waitMs: stalled.waitMs,
        nextBackoffStep: stalled.nextBackoffStep,
      };
    }
    return { action: "scroll", status: "running", waitMs: 0, scrollTarget: target };
  }
  if (decision.action === "observe") {
    return { action: "observe", status: "running", waitMs: OBSERVE_WAIT_MS, nextBackoffStep: 0 };
  }
  return {
    action: "wait",
    status: "waiting_for_posts",
    waitMs: decision.waitMs,
    nextBackoffStep: decision.nextBackoffStep,
  };
}

function applyPlan(session, plan, settings) {
  if (plan.action === "like") {
    const seenIds = session.seenIds.includes(plan.postId)
      ? session.seenIds
      : session.seenIds.concat(plan.postId);
    const likeCount = session.likeCount + 1;
    if (capDecision(likeCount, settings).reached) {
      return {
        ...session,
        seenIds,
        likeCount,
        running: false,
        stopReason: "cap",
        status: "cap_reached",
        backoffStep: 0,
      };
    }
    return { ...session, seenIds, likeCount, status: "running", backoffStep: 0 };
  }
  if (plan.action === "pause") return { ...session, status: "paused_inactive" };
  if (plan.action === "wait") {
    return { ...session, status: "waiting_for_posts", backoffStep: plan.nextBackoffStep };
  }
  if (plan.action === "stop_cap") {
    return { ...session, running: false, stopReason: "cap", status: "cap_reached" };
  }
  if (plan.action === "block_login") return { ...session, status: "not_logged_in" };
  if (plan.action === "skip_surface") return { ...session, status: "unsupported_page" };
  if (plan.action === "scroll") return { ...session, status: "running" };
  if (plan.action === "observe") return { ...session, status: "running", backoffStep: 0 };
  return session;
}

globalThis.XLikesPolicy = {
  POPUP_FOCUS_GRACE_MS,
  SETTINGS_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  OBSERVE_WAIT_MS,
  LOGIN_RECHECK_MS,
  UNSUPPORTED_RECHECK_MS,
  allowedAction,
  defaultSettings,
  settingsErrorMessage,
  statusMessage,
  validateSettings,
  nextDelayMs,
  capDecision,
  canStart,
  startSession,
  stopSession,
  activityDecision,
  blurPauseDelayMs,
  classifySurface,
  annotateThread,
  selectNextLike,
  chooseScrollTarget,
  scrollDecision,
  planTick,
  applyPlan,
};
