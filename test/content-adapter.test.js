import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "../lib/ui-languages.js";
import "../lib/policy.js";
import "../content/content.js";

const { defaultSettings } = globalThis.XLikesPolicy;
const {
  createSessionRunner,
  handleControlMessage,
  isLoginEntryHref,
  isLoginWallUrl,
  isReplyContext,
  likeControlState,
  statusIdFromHref,
  confirmPlainRepost,
} = globalThis.XLikesContent;

function harness(page, overrides = {}) {
  const clicks = [];
  const scrolls = [];
  const published = [];
  const timers = [];
  const reloads = [];
  let nextId = 1;
  const runner = createSessionRunner({
    getSettings: async () => defaultSettings(),
    readSnapshot: async () => page,
    clickLike: (postId) => {
      clicks.push(postId);
      return true;
    },
    openRepost: () => true,
    confirmRepost: () => "done",
    scrollBy: (target) => {
      scrolls.push(target);
    },
    publish: (session) => {
      published.push(session);
    },
    schedule: (ms, fn) => {
      const id = nextId;
      nextId += 1;
      timers.push({ id, ms, fn });
      return id;
    },
    cancel: (id) => {
      const index = timers.findIndex((timer) => timer.id === id);
      if (index >= 0) timers.splice(index, 1);
    },
    randomUnit: () => 0,
    now: () => 0,
    reload: () => reloads.push(1),
    ...overrides,
  });
  return { runner, clicks, scrolls, published, timers, reloads };
}

// schedule() swallows the tick promise, so flush the microtask chain the
// tick awaits (getSettings, readSnapshot) before reading the session.
async function runNextTimer(timers) {
  const timer = timers.shift();
  timer.fn();
  for (let step = 0; step < 10; step += 1) await Promise.resolve();
  return timer;
}

function homePage(overrides = {}) {
  return {
    documentVisible: true,
    windowFocused: true,
    tabActive: true,
    loginWall: false,
    url: "https://x.com/home",
    posts: [{ id: "10001", liked: false, isReply: false }],
    scroll: {
      attemptedScroll: false,
      beforeScrollY: 0,
      afterScrollY: 0,
      previousIds: [],
      currentIds: ["10001"],
    },
    scrollTarget: { documentScrollable: true, columnScrollable: false },
    ...overrides,
  };
}

test("a start message answers with a running session and keeps the channel open", () => {
  const { runner } = harness(homePage());
  let reply;
  const kept = handleControlMessage(runner, { type: "start" }, (session) => {
    reply = session;
  });
  assert.equal(kept, true);
  assert.deepEqual(reply, {
    status: "running",
    likeCount: 0,
    running: true,
    stopReason: null,
  });
});

test("start on a visible home timeline clicks the selected post once", async () => {
  const page = homePage();
  const { runner, clicks } = harness(page);
  await runner.start();
  assert.deepEqual(clicks, ["10001"]);
  assert.equal(runner.getSession().likeCount, 1);
  assert.equal(runner.getSession().running, true);
});

test("an inactive tab does not click and keeps the count", async () => {
  const { runner, clicks } = harness(homePage({ tabActive: false }));
  await runner.start();
  assert.deepEqual(clicks, []);
  assert.equal(runner.getSession().likeCount, 0);
  assert.equal(runner.getSession().status, "paused_inactive");
  assert.equal(runner.getSession().running, true);
});

test("a hidden document does not click and keeps the count", async () => {
  const page = homePage();
  const { runner, clicks } = harness(page);
  await runner.start();
  page.documentVisible = false;
  runner.onHide();
  assert.deepEqual(clicks, ["10001"]);
  assert.equal(runner.getSession().likeCount, 1);
  assert.equal(runner.getSession().status, "paused_inactive");
  assert.equal(runner.getSession().running, true);
});

test("a login wall does not click", async () => {
  const { runner, clicks } = harness(homePage({ loginWall: true, posts: [] }));
  await runner.start();
  assert.deepEqual(clicks, []);
  assert.equal(runner.getSession().status, "not_logged_in");
  assert.equal(runner.getSession().likeCount, 0);
  assert.equal(runner.getSession().running, true);
});

test("stop does not click again", async () => {
  const page = homePage();
  const { runner, clicks } = harness(page);
  await runner.start();
  runner.stop();
  await runner.onShow();
  assert.deepEqual(clicks, ["10001"]);
  assert.equal(runner.getSession().running, false);
  assert.equal(runner.getSession().likeCount, 1);
  assert.equal(runner.getSession().status, "stopped");
});

test("no eligible post asks the page to scroll", async () => {
  const { runner, clicks, scrolls } = harness(homePage({
    posts: [{ id: "10001", liked: true, reposted: true, isReply: false }],
    scroll: {
      attemptedScroll: false,
      beforeScrollY: 10,
      afterScrollY: 10,
      previousIds: ["10001"],
      currentIds: ["10001"],
    },
  }));
  await runner.start();
  assert.deepEqual(clicks, []);
  assert.deepEqual(scrolls, ["document"]);
  assert.equal(runner.getSession().running, true);
});

test("a status href yields that post id and not a shorter prefix", () => {
  assert.equal(statusIdFromHref("/reader/status/1234567890"), "1234567890");
  assert.equal(statusIdFromHref("/reader/status/1234567890/photo/1"), "1234567890");
  assert.notEqual(statusIdFromHref("/reader/status/1234567890"), "123456");
  assert.equal(statusIdFromHref("/home"), "");
});

test("the live sign-in href is a login wall entry", () => {
  assert.equal(
    isLoginEntryHref("/i/jf/onboarding/web?mode=login&redirect_after_login=%2F"),
    true,
  );
  assert.equal(isLoginWallUrl("https://x.com/i/jf/onboarding/web?redirect_after_login=%2Fhome&mode=login"), true);
  assert.equal(isLoginEntryHref("/login"), true);
  assert.equal(isLoginEntryHref("/i/flow/login"), true);
  assert.equal(isLoginEntryHref("/home"), false);
  assert.equal(isLoginEntryHref("/X/status/2112722684710719913"), false);
});

test("a live Like button is the like control and a pressed one is already liked", () => {
  assert.equal(likeControlState({ testid: "like", ariaLabel: "", pressed: "" }), "like");
  assert.equal(likeControlState({ testid: "", ariaLabel: "Like", pressed: "false" }, "en"), "like");
  assert.equal(likeControlState({ testid: "", ariaLabel: "Like", pressed: "true" }, "en"), "liked");
  assert.equal(likeControlState({ testid: "unlike", ariaLabel: "", pressed: "" }, "en"), "liked");
  assert.equal(likeControlState({ testid: "", ariaLabel: "Unlike", pressed: "true" }, "en"), "liked");
  assert.equal(likeControlState({ testid: "", ariaLabel: "Repost", pressed: "false" }), "other");
  assert.equal(likeControlState({ testid: "", ariaLabel: "Curtir", pressed: "false" }, "pt-BR"), "like");
  assert.equal(likeControlState({ testid: "", ariaLabel: "Curtir", pressed: "true" }, "pt-BR"), "liked");
  assert.equal(likeControlState({ testid: "", ariaLabel: "Descurtir", pressed: "true" }, "pt-BR"), "liked");
  assert.equal(likeControlState({ testid: "", ariaLabel: "Repostar", pressed: "false" }), "other");
});

test("reply context accepts Replying to and Respondendo a", () => {
  assert.equal(isReplyContext("Replying to @reader"), true);
  assert.equal(isReplyContext("Respondendo a @reader"), true);
  assert.equal(isReplyContext("and for dessert, a little scroll"), false);
});

test("an opened repost is confirmed on the next tick and marked done", async () => {
  const page = homePage();
  const reposted = [];
  const confirmed = [];
  const { runner, timers } = harness(page, {
    openRepost: (postId) => {
      reposted.push(postId);
      return true;
    },
    confirmRepost: (postId) => {
      confirmed.push(postId);
      return "done";
    },
  });
  await runner.start();
  await runNextTimer(timers);
  assert.deepEqual(reposted, ["10001"]);
  assert.equal(runner.getSession().pendingRepostId, "10001");
  assert.deepEqual(confirmed, []);
  await runNextTimer(timers);
  assert.deepEqual(confirmed, ["10001"]);
  assert.deepEqual(runner.getSession().repostDoneIds, ["10001"]);
  assert.equal(runner.getSession().pendingRepostId, null);
});

test("a skipped repost confirm retries instead of marking the post done", async () => {
  const page = homePage();
  let confirmCalls = 0;
  const { runner, timers } = harness(page, {
    confirmRepost: (postId) => {
      confirmCalls += 1;
      return confirmCalls === 2 ? "done" : "skipped";
    },
  });
  await runner.start();
  await runNextTimer(timers);
  assert.equal(runner.getSession().pendingRepostId, "10001");
  await runNextTimer(timers);
  assert.equal(confirmCalls, 1);
  assert.deepEqual(runner.getSession().repostDoneIds, []);
  assert.equal(runner.getSession().pendingRepostId, "10001");
  assert.equal(runner.getSession().running, true);
  await runNextTimer(timers);
  assert.equal(confirmCalls, 2);
  assert.deepEqual(runner.getSession().repostDoneIds, ["10001"]);
  assert.equal(runner.getSession().pendingRepostId, null);
});

test("a repost confirm gives up after three retries and releases the post", async () => {
  const page = homePage();
  let confirmCalls = 0;
  const { runner, timers } = harness(page, {
    confirmRepost: (postId) => {
      confirmCalls += 1;
      return "skipped";
    },
  });
  await runner.start();
  await runNextTimer(timers);
  while (confirmCalls < 10 && runner.getSession().pendingRepostId) {
    await runNextTimer(timers);
  }
  assert.equal(confirmCalls, 4);
  assert.equal(runner.getSession().pendingRepostId, null);
  assert.deepEqual(runner.getSession().repostDoneIds, ["10001"]);
});

test("a failed repost open retries until the button is found", async () => {
  const page = homePage();
  let openCalls = 0;
  const { runner, timers } = harness(page, {
    openRepost: (postId) => {
      openCalls += 1;
      return openCalls >= 3;
    },
    confirmRepost: (postId) => "done",
  });
  await runner.start();
  while (openCalls < 3) {
    await runNextTimer(timers);
  }
  assert.equal(runner.getSession().pendingRepostId, "10001");
  await runNextTimer(timers);
  assert.deepEqual(runner.getSession().repostDoneIds, ["10001"]);
  assert.equal(runner.getSession().running, true);
});

test("a running session reloads the page once every five minutes", async () => {
  let clock = 0;
  const { runner, timers, reloads } = harness(homePage(), { now: () => clock });
  await runner.start();
  assert.deepEqual(reloads, []);
  clock = 299999;
  await runNextTimer(timers);
  assert.deepEqual(reloads, []);
  clock = 300000;
  await runNextTimer(timers);
  assert.deepEqual(reloads, [1]);
  assert.equal(timers.length, 0); // the reload replaces the tick loop
  assert.equal(runner.getSession().running, true); // still running for the next page
});

test("resume continues a session saved before the reload", async () => {
  let clock = 0;
  const { runner, timers, reloads } = harness(homePage(), { now: () => clock });
  await runner.resume({ likeCount: 5, running: true });
  assert.equal(runner.getSession().running, true);
  assert.equal(runner.getSession().likeCount, 6); // the saved 5 plus the fresh like
  assert.deepEqual(runner.getSession().repostDoneIds, []);
  clock = 300000;
  await runNextTimer(timers);
  assert.deepEqual(reloads, [1]);
});

test("stop ends the reload cycle", async () => {
  let clock = 0;
  const { runner, timers, reloads } = harness(homePage(), { now: () => clock });
  await runner.start();
  runner.stop();
  clock = 300000;
  assert.equal(timers.length, 0);
  assert.deepEqual(reloads, []);
});

function fakeRepostMenuDoc({ insideArticle = false } = {}) {
  const clickable = {
    innerText: "Repostar",
    getAttribute: () => "",
    querySelectorAll: () => [],
    closest: (sel) => (sel === "article" && insideArticle ? { placeholder: true } : null),
    clicked: 0,
    click() {
      this.clicked += 1;
    },
  };
  const label = {
    childElementCount: 0,
    innerText: "Repostar",
    getAttribute: () => "",
    closest: () => clickable,
  };
  return {
    clickable,
    querySelector: () => null,
    querySelectorAll(sel) {
      if (sel === "[role='menuitem'], [role='menuitemradio'], [role='button'], button, a") return [];
      if (sel.startsWith("span")) return [label];
      return [];
    },
  };
}

test("the repost menu fallback clicks the label outside any known menu root", () => {
  const doc = fakeRepostMenuDoc();
  assert.equal(confirmPlainRepost(doc, "pt-BR"), "done");
  assert.equal(doc.clickable.clicked, 1);
});

test("the retweetConfirm anchor is clicked even without any known menu root", () => {
  const anchor = {
    innerText: "Repostar",
    textContent: "Repostar",
    getAttribute: () => "",
    querySelectorAll: () => [],
    closest: () => null,
    clicked: 0,
    click() {
      this.clicked += 1;
    },
  };
  const doc = {
    querySelector: (sel) => (sel === "[data-testid='retweetConfirm']" ? anchor : null),
    querySelectorAll: () => [],
  };
  assert.equal(confirmPlainRepost(doc, "pt-BR"), "done");
  assert.equal(anchor.clicked, 1);
});

test("a bare repost label walks up to its tabindex menu row", () => {
  const row = {
    getAttribute: () => "",
    querySelectorAll: () => [],
    closest: () => null,
    clicked: 0,
    click() {
      this.clicked += 1;
    },
  };
  const label = {
    childElementCount: 0,
    innerText: "Repostar",
    textContent: "Repostar",
    getAttribute: () => "",
    closest: (sel) => (sel.startsWith("[tabindex]") ? row : null),
  };
  const doc = {
    querySelector: () => null,
    querySelectorAll(sel) {
      if (sel.startsWith("span")) return [label];
      return [];
    },
  };
  assert.equal(confirmPlainRepost(doc, "pt-BR"), "done");
  assert.equal(row.clicked, 1);
});

test("timeline repost buttons are never treated as the open menu", () => {
  const doc = fakeRepostMenuDoc({ insideArticle: true });
  let closed = 0;
  assert.equal(confirmPlainRepost(doc, "pt-BR", () => { closed += 1; }), "skipped");
  assert.equal(closed, 1);
  assert.equal(doc.clickable.clicked, 0);
});

test("the content script does not touch cookies or an X API token", () => {
  const source = readFileSync(new URL("../content/content.js", import.meta.url), "utf8");
  assert.equal(source.includes("chrome.cookies"), false);
  assert.equal(source.includes("chrome.identity"), false);
  assert.equal(source.includes("api.x.com"), false);
  assert.equal(source.includes("planTick"), true);
  assert.equal(source.includes("button[data-testid='like']"), true);
  const labels = readFileSync(new URL("../lib/ui-languages.js", import.meta.url), "utf8");
  assert.equal(labels.includes("Curtir"), true);
  assert.equal(labels.includes("Repostar"), true);
  assert.equal(labels.includes("Comentar"), true);
  assert.equal(labels.includes("Quote"), true);
});
