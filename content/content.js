const policy = globalThis.XLikesPolicy;

const TWEET = [
  "article[data-testid='tweet']",
  "article:has(button[data-testid='like'])",
  "article:has(button[data-testid='unlike'])",
  "article:has(button[aria-label='Like'])",
  "article:has(button[aria-label='Unlike'])",
  "article:has(button[aria-label='Curtir'])",
  "article:has(button[aria-label='Descurtir'])",
].join(", ");

function createSessionRunner({
  rules = policy,
  getSettings,
  readSnapshot,
  clickLike,
  scrollBy,
  publish,
  schedule,
  cancel,
  randomUnit,
}) {
  let session = {
    running: false,
    likeCount: 0,
    seenIds: [],
    stopReason: null,
    status: "stopped",
    backoffStep: 0,
  };
  let popupOpen = false;
  let timer = null;
  let blurTimer = null;

  function snapshot() {
    return {
      status: session.status,
      likeCount: session.likeCount,
      running: session.running,
      stopReason: session.stopReason,
    };
  }

  function publishNow() {
    publish(snapshot());
  }

  function clearTimer() {
    if (timer != null) {
      cancel(timer);
      timer = null;
    }
  }

  function clearBlur() {
    if (blurTimer != null) {
      cancel(blurTimer);
      blurTimer = null;
    }
  }

  async function tick() {
    const settings = await getSettings();
    const page = await readSnapshot();
    const plan = rules.planTick({
      session,
      settings,
      documentVisible: page.documentVisible,
      popupOpen,
      windowFocused: page.windowFocused,
      tabActive: page.tabActive,
      loginWall: page.loginWall,
      url: page.url,
      posts: page.posts,
      randomUnit: randomUnit(),
      scroll: page.scroll,
      scrollTarget: page.scrollTarget,
    });

    let performed = plan;
    if (plan.action === "like" && clickLike(plan.postId) === false) {
      performed = {
        action: "wait",
        status: "waiting_for_posts",
        waitMs: 2000,
        nextBackoffStep: session.backoffStep,
      };
    } else if (plan.action === "scroll") {
      scrollBy(plan.scrollTarget);
    }

    session = rules.applyPlan(session, performed, settings);
    publishNow();
    clearTimer();
    const keepWaiting = session.running && performed.action !== "pause" && performed.action !== "idle";
    if (keepWaiting) {
      timer = schedule(performed.waitMs, () => {
        timer = null;
        tick();
      });
    }
  }

  return {
    start() {
      clearBlur();
      clearTimer();
      session = rules.startSession();
      publishNow();
      return tick();
    },
    stop() {
      clearBlur();
      clearTimer();
      session = rules.stopSession(session);
      publishNow();
    },
    onPopup(open) {
      popupOpen = open === true;
    },
    onHide() {
      clearBlur();
      clearTimer();
      if (!session.running) return;
      session = rules.applyPlan(session, { action: "pause", status: "paused_inactive", waitMs: 0 }, rules.defaultSettings());
      publishNow();
    },
    onBlur() {
      const delay = rules.blurPauseDelayMs({ becameHidden: false, popupOpen });
      if (delay == null) return;
      clearBlur();
      blurTimer = schedule(delay, () => {
        blurTimer = null;
        if (session.running) tick();
      });
    },
    onShow() {
      clearBlur();
      if (!session.running) return;
      return tick();
    },
    getSession() {
      return session;
    },
  };
}

function visible(element) {
  if (!element) return false;
  const style = getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function outermostTweets(doc) {
  return [...doc.querySelectorAll(TWEET)].filter((article) => !article.parentElement?.closest(TWEET));
}

function statusIdFromHref(href) {
  const match = String(href ?? "").match(/\/status\/(\d+)/);
  return match ? match[1] : "";
}

function isLoginEntryHref(href) {
  if (!href) return false;
  try {
    const url = new URL(href, "https://x.com");
    return url.pathname === "/login"
      || url.pathname === "/i/flow/login"
      || url.pathname === "/i/jf/onboarding/web";
  } catch {
    return false;
  }
}

function isLoginWallUrl(href) {
  return isLoginEntryHref(href);
}

const NOT_YET_LIKED = new Set(["Like", "Curtir"]);
const ALREADY_LIKED = new Set(["Unlike", "Descurtir"]);

function likeControlState({ testid = "", ariaLabel = "", pressed = "" } = {}) {
  if (testid === "unlike" || ALREADY_LIKED.has(ariaLabel)) return "liked";
  if (ariaLabel === "Repost" || ariaLabel === "Repostar") return "other";
  if (testid === "like") return "like";
  if (NOT_YET_LIKED.has(ariaLabel) && pressed === "true") return "liked";
  if (NOT_YET_LIKED.has(ariaLabel)) return "like";
  return "other";
}

function isReplyContext(text) {
  const value = String(text ?? "");
  return /\breplying to\b/i.test(value) || /\brespondendo a\b/i.test(value);
}

function controlState(button) {
  return likeControlState({
    testid: button.getAttribute("data-testid") || "",
    ariaLabel: button.getAttribute("aria-label") || "",
    pressed: button.getAttribute("aria-pressed") || "",
  });
}

function articleStatusId(article) {
  const timed = article.querySelector("a[href*='/status/'] time")?.closest("a");
  const href = (timed ?? article.querySelector("a[href*='/status/']"))?.getAttribute("href") ?? "";
  return statusIdFromHref(href);
}

function collectPosts(doc) {
  return outermostTweets(doc).map((article) => ({
    id: articleStatusId(article),
    liked: [...article.querySelectorAll("button")].some((button) => controlState(button) === "liked"),
    isReply: Boolean(article.querySelector("[data-testid='socialContext']")) || isReplyContext(article.innerText),
  }));
}

function loginWallVisible(doc, href) {
  if (doc.querySelectorAll(TWEET).length > 0) return false;
  if (isLoginWallUrl(href)) return true;
  return [...doc.querySelectorAll("a, [data-testid='loginButton'], [data-testid='signupButton']")].some((el) => {
    const testid = el.getAttribute("data-testid");
    if ((testid === "loginButton" || testid === "signupButton") && visible(el)) return true;
    return isLoginEntryHref(el.getAttribute("href"));
  });
}

function scrollY(target, doc, windowRef) {
  if (target === "column") {
    return doc.querySelector("[data-testid='primaryColumn']")?.scrollTop ?? 0;
  }
  return windowRef.scrollY || doc.scrollingElement?.scrollTop || 0;
}

function boot(chromeApi = globalThis.chrome, doc = globalThis.document, windowRef = globalThis.window) {
  let lastY = scrollY("document", doc, windowRef);
  let armed = false;
  let armedBefore = 0;
  let armedTarget = "document";
  let previousIds = [];

  const runner = createSessionRunner({
    getSettings: async () => {
      const stored = await chromeApi.storage.local.get(policy.SETTINGS_STORAGE_KEY);
      const raw = stored[policy.SETTINGS_STORAGE_KEY] ?? policy.defaultSettings();
      const validated = policy.validateSettings(raw);
      return validated.ok ? validated.settings : policy.defaultSettings();
    },
    readSnapshot: () => {
      const posts = collectPosts(doc);
      const column = doc.querySelector("[data-testid='primaryColumn']");
      const root = doc.scrollingElement || doc.documentElement;
      const after = scrollY(armed ? armedTarget : "document", doc, windowRef);
      const snapshot = {
        documentVisible: doc.visibilityState === "visible",
        windowFocused: doc.hasFocus(),
        tabActive: doc.visibilityState === "visible",
        loginWall: loginWallVisible(doc, windowRef.location.href),
        url: windowRef.location.href,
        posts,
        scroll: {
          attemptedScroll: armed,
          beforeScrollY: armed ? armedBefore : lastY,
          afterScrollY: after,
          previousIds,
          currentIds: posts.map((post) => post.id).filter(Boolean),
        },
        scrollTarget: {
          documentScrollable: root.scrollHeight > root.clientHeight + 2,
          columnScrollable: Boolean(column) && column.scrollHeight > column.clientHeight + 2,
        },
      };
      previousIds = snapshot.scroll.currentIds;
      lastY = after;
      armed = false;
      return snapshot;
    },
    clickLike: (postId) => {
      if (doc.visibilityState !== "visible") return false;
      const article = outermostTweets(doc).find((node) => articleStatusId(node) === String(postId));
      if (!article) return false;
      const button = [...article.querySelectorAll("button")].find((node) => controlState(node) === "like");
      if (!button) return false;
      const rect = article.getBoundingClientRect();
      const reveal = policy.likedPostScroll({
        role: "post",
        top: rect.top,
        bottom: rect.bottom,
        viewportHeight: windowRef.innerHeight,
      });
      if (reveal.action === "scroll" && reveal.element === "post") {
        article.scrollIntoView({ behavior: reveal.behavior, block: reveal.block });
      }
      button.click();
      return true;
    },
    scrollBy: (target) => {
      const delta = Math.max(240, Math.floor(windowRef.innerHeight * 0.8));
      armedTarget = target === "column" ? "column" : "document";
      armedBefore = scrollY(armedTarget, doc, windowRef);
      armed = true;
      if (armedTarget === "column") {
        doc.querySelector("[data-testid='primaryColumn']")?.scrollBy(0, delta);
      } else {
        windowRef.scrollBy(0, delta);
      }
    },
    publish: (session) => {
      chromeApi.storage.session.set({ [policy.SESSION_STORAGE_KEY]: session });
    },
    schedule: (ms, fn) => windowRef.setTimeout(fn, ms),
    cancel: (id) => windowRef.clearTimeout(id),
    randomUnit: () => Math.random(),
  });

  chromeApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== "string") return;
    if (message.type === "popup-open") runner.onPopup(true);
    if (message.type === "popup-close") runner.onPopup(false);
    if (message.type === "start") {
      runner.start();
      sendResponse(runner.getSession());
    }
    if (message.type === "stop") {
      runner.stop();
      sendResponse(runner.getSession());
    }
    if (message.type === "get-status") sendResponse(runner.getSession());
  });

  doc.addEventListener("visibilitychange", () => {
    if (doc.visibilityState === "hidden") runner.onHide();
    else runner.onShow();
  });
  windowRef.addEventListener("blur", () => runner.onBlur());
  windowRef.addEventListener("focus", () => runner.onShow());
  return runner;
}

globalThis.XLikesContent = {
  createSessionRunner,
  statusIdFromHref,
  isLoginEntryHref,
  isLoginWallUrl,
  likeControlState,
  isReplyContext,
  collectPosts,
  boot,
};

if (typeof chrome !== "undefined" && chrome.runtime?.id) {
  boot();
}
