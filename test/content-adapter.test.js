import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { defaultSettings } from "../lib/policy.js";
import { createSessionRunner, statusIdFromHref } from "../content/content.js";

function harness(page) {
  const clicks = [];
  const scrolls = [];
  const published = [];
  const timers = [];
  let nextId = 1;
  const runner = createSessionRunner({
    getSettings: async () => defaultSettings(),
    readSnapshot: async () => page,
    clickLike: (postId) => {
      clicks.push(postId);
      return true;
    },
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
  });
  return { runner, clicks, scrolls, published, timers };
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
    posts: [{ id: "10001", liked: true, isReply: false }],
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

test("the content script does not touch cookies or an X API token", () => {
  const source = readFileSync(new URL("../content/content.js", import.meta.url), "utf8");
  assert.equal(source.includes("chrome.cookies"), false);
  assert.equal(source.includes("chrome.identity"), false);
  assert.equal(source.includes("api.x.com"), false);
  assert.equal(source.includes("planTick"), true);
  assert.equal(source.includes("button[data-testid='like']"), true);
});
