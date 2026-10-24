const policy = globalThis.XLikesPolicy;

function tweetSelector(languageId) {
  const pack = policy.interfacePack(languageId);
  const labels = [...(pack?.like || []), ...(pack?.unlike || [])];
  return [
    "article[data-testid='tweet']",
    "article:has(button[data-testid='like'])",
    "article:has(button[data-testid='unlike'])",
    ...labels.map((label) => `article:has(button[aria-label='${label}'])`),
  ].join(", ");
}

function createSessionRunner({
  rules = policy,
  getSettings,
  readSnapshot,
  clickLike,
  openRepost = () => false,
  confirmRepost = () => "missing",
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
    const page = await readSnapshot(settings);
    const plan = rules.planTick({
      session,
      settings,
      documentVisible: page.documentVisible,
      popupOpen,
      windowFocused: page.windowFocused,
      tabActive: page.tabActive,
      loginWall: page.loginWall,
      automationNotice: page.automationNotice,
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
    } else if (plan.action === "repost-open" && openRepost(plan.postId) === false) {
      performed = { ...plan, action: "repost-confirm" };
    } else if (plan.action === "repost-confirm") {
      confirmRepost(plan.postId);
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

function outermostTweets(doc, languageId) {
  const selector = tweetSelector(languageId);
  return [...doc.querySelectorAll(selector)].filter((article) => !article.parentElement?.closest("article"));
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

function likeControlState(attrs, languageId = "pt-BR") {
  return policy.likeControlState(attrs, languageId);
}

function isReplyContext(text) {
  const value = String(text ?? "");
  return /\breplying to\b/i.test(value) || /\brespondendo a\b/i.test(value);
}

function controlState(button, languageId) {
  return likeControlState({
    testid: button.getAttribute("data-testid") || "",
    ariaLabel: button.getAttribute("aria-label") || "",
    pressed: button.getAttribute("aria-pressed") || "",
  }, languageId);
}

function repostState(button, languageId) {
  return policy.repostControlState({
    ariaLabel: button.getAttribute("aria-label") || "",
    pressed: button.getAttribute("aria-pressed") || "",
  }, languageId);
}

function articleStatusId(article) {
  const timed = article.querySelector("a[href*='/status/'] time")?.closest("a");
  const href = (timed ?? article.querySelector("a[href*='/status/']"))?.getAttribute("href") ?? "";
  return statusIdFromHref(href);
}

function collectPosts(doc, languageId = "pt-BR") {
  return outermostTweets(doc, languageId).map((article) => ({
    id: articleStatusId(article),
    liked: [...article.querySelectorAll("button")].some((button) => controlState(button, languageId) === "liked"),
    reposted: [...article.querySelectorAll("button")].some((button) => repostState(button, languageId) === "reposted"),
    isReply: Boolean(article.querySelector("[data-testid='socialContext']")) || isReplyContext(article.innerText),
  }));
}

function loginWallVisible(doc, href, languageId = "pt-BR") {
  if (doc.querySelectorAll(tweetSelector(languageId)).length > 0) return false;
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

function menuItemText(el) {
  return (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
}

function repostMenuElements(doc) {
  const roots = [...doc.querySelectorAll("[role='menu'], [data-testid='Dropdown'], [data-testid='sheetDialog']")];
  const items = [];
  for (const root of roots) {
    const nodes = [...root.querySelectorAll("[role='menuitem'], [role='button'], button, a")];
    for (const el of nodes) {
      const text = menuItemText(el);
      if (!text) continue;
      const innerMatch = [...el.querySelectorAll("[role='menuitem'], [role='button'], button, a")]
        .some((child) => menuItemText(child) === text);
      if (innerMatch) continue;
      items.push({ text, el });
    }
  }
  return items;
}

function confirmPlainRepost(doc, languageId, closeMenu = () => {}) {
  const choice = policy.repostMenuChoice(repostMenuElements(doc), languageId);
  if (choice.action === "click") {
    const item = repostMenuElements(doc).find((entry) => entry.text === choice.text);
    if (item) {
      item.el.click();
      return "done";
    }
  }
  closeMenu();
  return "skipped";
}

function boot(chromeApi = globalThis.chrome, doc = globalThis.document, windowRef = globalThis.window) {
  let lastY = scrollY("document", doc, windowRef);
  let armed = false;
  let armedBefore = 0;
  let armedTarget = "document";
  let previousIds = [];
  let interfaceLanguage = "pt-BR";

  function revealPost(article) {
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
  }

  function articleFor(postId) {
    return outermostTweets(doc, interfaceLanguage).find((node) => articleStatusId(node) === String(postId));
  }

  function closeRepostMenu() {
    doc.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
  }

  const runner = createSessionRunner({
    getSettings: async () => {
      const stored = await chromeApi.storage.local.get(policy.SETTINGS_STORAGE_KEY);
      const raw = stored[policy.SETTINGS_STORAGE_KEY] ?? policy.defaultSettings();
      const validated = policy.validateSettings(raw);
      return validated.ok ? validated.settings : policy.defaultSettings();
    },
    readSnapshot: (settings) => {
      interfaceLanguage = settings?.interfaceLanguage || "pt-BR";
      const posts = collectPosts(doc, interfaceLanguage);
      const column = doc.querySelector("[data-testid='primaryColumn']");
      const root = doc.scrollingElement || doc.documentElement;
      const after = scrollY(armed ? armedTarget : "document", doc, windowRef);
      const snapshot = {
        documentVisible: doc.visibilityState === "visible",
        windowFocused: doc.hasFocus(),
        tabActive: doc.visibilityState === "visible",
        loginWall: loginWallVisible(doc, windowRef.location.href, interfaceLanguage),
        automationNotice: policy.automationNoticeVisible(doc.body?.innerText || ""),
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
      const article = articleFor(postId);
      if (!article) return false;
      const button = [...article.querySelectorAll("button")].find((node) => controlState(node, interfaceLanguage) === "like");
      if (!button) return false;
      revealPost(article);
      button.click();
      return true;
    },
    openRepost: (postId) => {
      if (doc.visibilityState !== "visible") return false;
      const article = articleFor(postId);
      if (!article) return false;
      const button = [...article.querySelectorAll("button, [role='button']")].find((node) => repostState(node, interfaceLanguage) === "repost");
      if (!button) return false;
      revealPost(article);
      button.click();
      return true;
    },
    confirmRepost: () => confirmPlainRepost(doc, interfaceLanguage, closeRepostMenu),
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
      try {
        const area = chromeApi.storage?.session;
        if (!area || typeof area.set !== "function") return;
        const pending = area.set({ [policy.SESSION_STORAGE_KEY]: session });
        if (pending && typeof pending.catch === "function") pending.catch(() => {});
      } catch {
        // The start reply still carries the session when session storage is closed.
      }
    },
    schedule: (ms, fn) => windowRef.setTimeout(fn, ms),
    cancel: (id) => windowRef.clearTimeout(id),
    randomUnit: () => Math.random(),
  });

  chromeApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== "string") return;
    try {
      if (message.type === "popup-open") runner.onPopup(true);
      else if (message.type === "popup-close") runner.onPopup(false);
      else if (message.type === "start") {
        const pending = runner.start();
        if (pending && typeof pending.catch === "function") pending.catch(() => {});
      }
      else if (message.type === "stop") runner.stop();
      else if (message.type !== "get-status") return;
      sendResponse(runner.getSession());
    } catch {
      sendResponse(null);
    }
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
  repostMenuElements,
  confirmPlainRepost,
  boot,
};

if (typeof chrome !== "undefined" && chrome.runtime?.id) {
  boot();
}
