import assert from "node:assert/strict";
import test from "node:test";
import "../lib/ui-languages.js";
import "../lib/policy.js";

const {
  POPUP_FOCUS_GRACE_MS,
  SESSION_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  activityDecision,
  allowedAction,
  annotateThread,
  applyPlan,
  blurPauseDelayMs,
  canStart,
  capDecision,
  likedPostScroll,
  chooseScrollTarget,
  classifySurface,
  likeControlState,
  defaultSettings,
  nextDelayMs,
  planTick,
  scrollDecision,
  selectNextLike,
  settingsErrorMessage,
  startSession,
  statusMessage,
  popupView,
  repostControlState,
  repostMenuChoice,
  stopSession,
  validateSettings,
} = globalThis.XLikesPolicy;

function view(overrides = {}) {
  const session = overrides.session ?? startSession();
  const settings = overrides.settings ?? defaultSettings();
  return {
    session,
    settings,
    documentVisible: true,
    popupOpen: false,
    windowFocused: true,
    tabActive: true,
    loginWall: false,
    url: "https://x.com/home",
    posts: [{ id: "10001", liked: false, isReply: false }],
    randomUnit: 0,
    scroll: {
      attemptedScroll: false,
      beforeScrollY: 0,
      afterScrollY: 0,
      previousIds: [],
      currentIds: ["10001"],
    },
    scrollTarget: { documentScrollable: true, columnScrollable: false },
    ...overrides,
    session,
    settings,
  };
}

test("only like is an allowed action", () => {
  assert.equal(allowedAction("like"), true);
});

test("repost is refused", () => {
  assert.equal(allowedAction("repost"), false);
});

test("reply is refused", () => {
  assert.equal(allowedAction("reply"), false);
});

test("follow is refused", () => {
  assert.equal(allowedAction("follow"), false);
});

test("dm is refused", () => {
  assert.equal(allowedAction("dm"), false);
});

test("login is refused", () => {
  assert.equal(allowedAction("login"), false);
});

test("collect_cookies is refused", () => {
  assert.equal(allowedAction("collect_cookies"), false);
});

test("start sets a fresh session", () => {
  assert.deepEqual(startSession(), {
    running: true,
    likeCount: 0,
    seenIds: [],
    repostDoneIds: [],
    pendingRepostId: null,
    stopReason: null,
    status: "running",
    backoffStep: 0,
  });
});

test("stop keeps the count and does not stay running", () => {
  const stopped = stopSession({ ...startSession(), likeCount: 3, seenIds: ["9"] });
  assert.equal(stopped.running, false);
  assert.equal(stopped.likeCount, 3);
  assert.deepEqual(stopped.seenIds, ["9"]);
  assert.equal(stopped.stopReason, "user");
  assert.equal(stopped.status, "stopped");
  const plan = planTick(view({ session: stopped }));
  assert.equal(plan.action, "idle");
  assert.equal(plan.status, "stopped");
  assert.equal(plan.postId, undefined);
});

test("a login wall blocks clicks and rechecks after 2000 ms", () => {
  const plan = planTick(view({ loginWall: true }));
  assert.equal(plan.action, "block_login");
  assert.equal(plan.status, "not_logged_in");
  assert.equal(plan.waitMs, 2000);
  assert.equal(plan.postId, undefined);
  const next = applyPlan(startSession(), plan, defaultSettings());
  assert.equal(next.likeCount, 0);
  assert.equal(next.running, true);
  assert.equal(next.status, "not_logged_in");
});

test("the same session resumes after the login wall is gone", () => {
  const session = { ...startSession(), likeCount: 4, seenIds: ["10001"] };
  const plan = planTick(view({
    session,
    loginWall: false,
    posts: [{ id: "10002", liked: false, isReply: false }],
  }));
  assert.equal(plan.action, "like");
  assert.equal(plan.postId, "10002");
  assert.equal(session.likeCount, 4);
});

test("a hidden document pauses without changing the count", () => {
  const session = { ...startSession(), likeCount: 4, seenIds: ["10001"] };
  const plan = planTick(view({ session, documentVisible: false }));
  assert.equal(plan.action, "pause");
  assert.equal(plan.status, "paused_inactive");
  const next = applyPlan(session, plan, defaultSettings());
  assert.equal(next.likeCount, 4);
  assert.deepEqual(next.seenIds, ["10001"]);
  assert.equal(next.running, true);
});

test("blur grace is 0 ms when the document becomes hidden", () => {
  assert.equal(blurPauseDelayMs({ becameHidden: true, popupOpen: false }), 0);
});

test("an unfocused window pauses and keeps the count", () => {
  const session = { ...startSession(), likeCount: 2 };
  const plan = planTick(view({ session, windowFocused: false }));
  assert.equal(activityDecision({
    documentVisible: true,
    popupOpen: false,
    windowFocused: false,
    tabActive: true,
  }), "pause");
  assert.equal(plan.action, "pause");
  assert.equal(applyPlan(session, plan, defaultSettings()).likeCount, 2);
});

test("a background tab pauses and keeps the count", () => {
  const session = { ...startSession(), likeCount: 4, seenIds: ["10001"] };
  const plan = planTick(view({ session, tabActive: false }));
  assert.equal(activityDecision({
    documentVisible: true,
    popupOpen: false,
    windowFocused: true,
    tabActive: false,
  }), "pause");
  assert.equal(plan.action, "pause");
  const next = applyPlan(session, plan, defaultSettings());
  assert.equal(next.likeCount, 4);
  assert.deepEqual(next.seenIds, ["10001"]);
  assert.equal(next.running, true);
});

test("an open popup keeps the session running while the document is visible", () => {
  const plan = planTick(view({ popupOpen: true, windowFocused: false, tabActive: true }));
  assert.equal(activityDecision({
    documentVisible: true,
    popupOpen: true,
    windowFocused: false,
    tabActive: true,
  }), "run");
  assert.equal(plan.action, "like");
  assert.equal(plan.status, "running");
});

test("blur waits 200 ms when the popup is not open", () => {
  assert.equal(POPUP_FOCUS_GRACE_MS, 200);
  assert.equal(blurPauseDelayMs({ becameHidden: false, popupOpen: false }), 200);
  assert.equal(blurPauseDelayMs({ becameHidden: false, popupOpen: true }), null);
});

test("resume keeps the count and the seen ids", () => {
  const session = {
    ...startSession(),
    likeCount: 4,
    seenIds: ["10001"],
    status: "paused_inactive",
  };
  const plan = planTick(view({
    session,
    posts: [{ id: "10002", liked: false, isReply: false }],
  }));
  const next = applyPlan(session, plan, defaultSettings());
  assert.equal(plan.action, "like");
  assert.equal(next.likeCount, 5);
  assert.deepEqual(next.seenIds, ["10001", "10002"]);
});

test("home, profile, and search select the first post that is not liked", () => {
  const posts = [
    { id: "10001", liked: true, reposted: true, isReply: false },
    { id: "10002", liked: false, isReply: false },
  ];
  for (const url of [
    "https://x.com/home",
    "https://x.com/somereader",
    "https://x.com/search?q=abc",
  ]) {
    const plan = planTick(view({ url, posts }));
    assert.equal(plan.action, "like");
    assert.equal(plan.postId, "10002");
  }
});

test("a missing id is skipped", () => {
  const picked = selectNextLike(
    [{ liked: false, isReply: false }, { id: "10002", liked: false, role: "post" }],
    [],
    true,
  );
  assert.deepEqual(picked, { id: "10002" });
});

test("a non-digit id is skipped", () => {
  const picked = selectNextLike(
    [{ id: "12ab", liked: false, role: "post" }, { id: "10002", liked: false, role: "post" }],
    [],
    true,
  );
  assert.deepEqual(picked, { id: "10002" });
});

test("an already liked post is not returned", () => {
  const picked = selectNextLike([{ id: "10001", liked: true, role: "post" }], [], true);
  assert.equal(picked, null);
});

test("a seen id is not returned", () => {
  const picked = selectNextLike([{ id: "10001", liked: false, role: "post" }], ["10001"], true);
  assert.equal(picked, null);
});

test("the same id offered twice is selected once", () => {
  const picked = selectNextLike(
    [
      { id: "10001", liked: false, role: "post" },
      { id: "10001", liked: false, role: "post" },
    ],
    [],
    true,
  );
  assert.deepEqual(picked, { id: "10001" });
  const again = selectNextLike(
    [{ id: "10001", liked: false, role: "post" }],
    ["10001"],
    true,
  );
  assert.equal(again, null);
});

test("applying a like remembers the id and increments the count", () => {
  const plan = planTick(view());
  const next = applyPlan(startSession(), plan, defaultSettings());
  assert.equal(plan.postId, "10001");
  assert.equal(next.likeCount, 1);
  assert.deepEqual(next.seenIds, ["10001"]);
  assert.equal(next.status, "running");
});

test("defaults are 5 seconds, cap off at 100, and original posts on", () => {
  assert.deepEqual(defaultSettings(), {
    intervalSeconds: 5,
    capEnabled: false,
    cap: 100,
    likeOriginalInReplyThread: true,
    alsoRepost: true,
    interfaceLanguage: "pt-BR",
  });
});

test("a missing repost switch stays on and a missing language is Brazilian Portuguese", () => {
  const result = validateSettings({ intervalSeconds: 5, capEnabled: false });
  assert.equal(result.ok, true);
  assert.equal(result.settings.alsoRepost, true);
  assert.equal(result.settings.interfaceLanguage, "pt-BR");
  assert.equal(validateSettings({ intervalSeconds: 5, capEnabled: false, interfaceLanguage: "en" }).settings.interfaceLanguage, "en");
  assert.equal(validateSettings({ intervalSeconds: 5, capEnabled: false, interfaceLanguage: "zz" }).settings.interfaceLanguage, "pt-BR");
});

test("pt-BR clicks Repostar and never Comentar", () => {
  assert.deepEqual(repostMenuChoice([
    { text: "Repostar" },
    { text: "Comentar" },
  ], "pt-BR"), { action: "click", text: "Repostar" });
  assert.deepEqual(repostMenuChoice([{ text: "Comentar" }], "pt-BR"), {
    action: "escape",
    reason: "missing",
  });
});

test("english clicks Repost and never Quote", () => {
  assert.deepEqual(repostMenuChoice([
    { text: "Repost" },
    { text: "Quote" },
  ], "en"), { action: "click", text: "Repost" });
  assert.deepEqual(repostMenuChoice([{ text: "Quote" }], "en"), {
    action: "escape",
    reason: "missing",
  });
});

test("spanish clicks Repostear and never Cita", () => {
  assert.deepEqual(repostMenuChoice([
    { text: "Repostear" },
    { text: "Cita" },
  ], "es"), { action: "click", text: "Repostear" });
  assert.deepEqual(repostMenuChoice([{ text: "Cita" }], "es"), {
    action: "escape",
    reason: "missing",
  });
  assert.equal(repostControlState({ ariaLabel: "Deshacer repost", pressed: "false" }, "es"), "reposted");
  assert.equal(repostControlState({ ariaLabel: "Repostear", pressed: "true" }, "es"), "reposted");
  assert.deepEqual(repostMenuChoice([{ text: "Deshacer repost" }, { text: "Cita" }], "es"), {
    action: "escape",
    reason: "already-reposted",
  });
  assert.equal(likeControlState({ ariaLabel: "Me gusta", pressed: "false" }, "es"), "like");
  assert.equal(likeControlState({ ariaLabel: "Cancelar Me gusta", pressed: "false" }, "es"), "liked");
});

test("every sourced language keeps plain repost apart from quote and undo", () => {
  assert.equal(globalThis.XLikesLanguages.some((language) => language.id === "ur"), false);
  for (const language of globalThis.XLikesLanguages) {
    const repost = language.repost[0];
    const quote = language.quote[0];
    const undo = language.undoRepost[0];
    assert.notEqual(repost, quote);
    assert.notEqual(repost, undo);
    assert.notEqual(language.like[0], language.unlike[0]);
    assert.deepEqual(repostMenuChoice([
      { text: repost },
      { text: quote },
    ], language.id), { action: "click", text: repost });
    assert.deepEqual(repostMenuChoice([{ text: quote }], language.id), {
      action: "escape",
      reason: "missing",
    });
    assert.deepEqual(repostMenuChoice([{ text: undo }, { text: quote }], language.id), {
      action: "escape",
      reason: "already-reposted",
    });
  }
});

test("an already reposted post is not reposted again", () => {
  assert.equal(repostControlState({ ariaLabel: "Desfazer repost", pressed: "false" }, "pt-BR"), "reposted");
  assert.equal(repostControlState({ ariaLabel: "Repostar", pressed: "true" }, "pt-BR"), "reposted");
  assert.equal(repostControlState({ ariaLabel: "Undo repost", pressed: "false" }, "en"), "reposted");
  assert.equal(repostControlState({ ariaLabel: "Repost", pressed: "true" }, "en"), "reposted");
  assert.deepEqual(repostMenuChoice([{ text: "Desfazer repost" }, { text: "Comentar" }], "pt-BR"), {
    action: "escape",
    reason: "already-reposted",
  });
});

test("interval 0 is rejected", () => {
  const result = validateSettings({ ...defaultSettings(), intervalSeconds: 0 });
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ["interval"]);
  assert.equal(result.settings, undefined);
});

test("interval 61 is rejected", () => {
  const result = validateSettings({ ...defaultSettings(), intervalSeconds: 61 });
  assert.deepEqual(result.errors, ["interval"]);
});

test("interval 1.5 is rejected", () => {
  const result = validateSettings({ ...defaultSettings(), intervalSeconds: 1.5 });
  assert.deepEqual(result.errors, ["interval"]);
});

test("an empty interval is rejected", () => {
  const result = validateSettings({});
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ["interval"]);
});

test("the interval error sentence is exact", () => {
  assert.equal(
    settingsErrorMessage("interval"),
    "O intervalo precisa ser um número inteiro de 1 a 60.",
  );
});

test("a 1 second interval waits exactly 1000 ms", () => {
  assert.equal(nextDelayMs(1, 0), 1000);
  assert.equal(nextDelayMs(1, 0.99), 1000);
});

test("a 5 second interval at random 0 waits 4250 ms", () => {
  assert.equal(nextDelayMs(5, 0), 4250);
});

test("a 5 second interval at random 1 waits 5000 ms", () => {
  assert.equal(nextDelayMs(5, 1), 5000);
});

test("a 60 second interval at random 0 waits 51000 ms", () => {
  assert.equal(nextDelayMs(60, 0), 51000);
});

test("a 2 second interval at random 0 waits 1700 ms", () => {
  assert.equal(nextDelayMs(2, 0), 1700);
});

test("like plans use the interval delay", () => {
  const plan = planTick(view({
    settings: { ...defaultSettings(), intervalSeconds: 5 },
    randomUnit: 0,
  }));
  assert.equal(plan.waitMs, 4250);
});

test("cap off does not stop at 30 likes", () => {
  const session = { ...startSession(), likeCount: 30 };
  const plan = planTick(view({ session }));
  assert.equal(capDecision(30, defaultSettings()).reached, false);
  assert.equal(plan.action, "like");
});

test("cap off does not stop at 100000 likes", () => {
  const session = { ...startSession(), likeCount: 100000 };
  assert.equal(capDecision(100000, defaultSettings()).reached, false);
  assert.equal(planTick(view({ session })).action, "like");
});

test("an already reached cap does not select another like", () => {
  const settings = { ...defaultSettings(), capEnabled: true, cap: 2 };
  const session = { ...startSession(), likeCount: 2 };
  const plan = planTick(view({ session, settings }));
  assert.equal(plan.action, "stop_cap");
  assert.equal(plan.status, "cap_reached");
  assert.equal(plan.postId, undefined);
});

test("the like that reaches the cap stops the session", () => {
  const settings = { ...defaultSettings(), capEnabled: true, cap: 2 };
  const session = { ...startSession(), likeCount: 1 };
  const plan = planTick(view({ session, settings }));
  const next = applyPlan(session, plan, settings);
  assert.equal(plan.action, "like");
  assert.equal(next.likeCount, 2);
  assert.equal(next.running, false);
  assert.equal(next.stopReason, "cap");
  assert.equal(next.status, "cap_reached");
  const after = planTick(view({ session: next, settings }));
  assert.equal(after.action, "idle");
  assert.equal(after.status, "cap_reached");
});

test("cap 0 is rejected when the cap is on", () => {
  const result = validateSettings({ ...defaultSettings(), capEnabled: true, cap: 0 });
  assert.deepEqual(result.errors, ["cap"]);
});

test("a negative cap is rejected", () => {
  const result = validateSettings({ ...defaultSettings(), capEnabled: true, cap: -1 });
  assert.deepEqual(result.errors, ["cap"]);
});

test("a fractional cap is rejected", () => {
  const result = validateSettings({ ...defaultSettings(), capEnabled: true, cap: 1.5 });
  assert.deepEqual(result.errors, ["cap"]);
});

test("cap 1000001 is rejected", () => {
  const result = validateSettings({ ...defaultSettings(), capEnabled: true, cap: 1000001 });
  assert.deepEqual(result.errors, ["cap"]);
});

test("the cap error sentence is exact", () => {
  assert.equal(
    settingsErrorMessage("cap"),
    "O limite precisa ser um número inteiro de 1 a 1000000.",
  );
});

test("an empty cap is stored as 100 while the cap is off", () => {
  const result = validateSettings({ intervalSeconds: 5, capEnabled: false, cap: "" });
  assert.equal(result.ok, true);
  assert.equal(result.settings.cap, 100);
  assert.equal(result.settings.capEnabled, false);
});

test("interval and cap errors stay in that order", () => {
  const result = validateSettings({ intervalSeconds: 0, capEnabled: true, cap: 0 });
  assert.deepEqual(result.errors, ["interval", "cap"]);
});

test("status sentences are exact", () => {
  assert.equal(statusMessage("stopped"), "Parado");
  assert.equal(statusMessage("running"), "Curtindo");
  assert.equal(statusMessage("paused_inactive"), "Pausado: a aba do X não está ativa");
  assert.equal(statusMessage("waiting_for_posts"), "Aguardando novos posts");
  assert.equal(statusMessage("not_logged_in"), "Entre no X nesta aba para começar");
  assert.equal(statusMessage("cap_reached"), "Limite da sessão atingido");
  assert.equal(statusMessage("unsupported_page"), "Esta página do X não entra na curtida automática");
});

test("home and search paths classify", () => {
  assert.equal(classifySurface("https://x.com/"), "home");
  assert.equal(classifySurface("https://x.com/home"), "home");
  assert.equal(classifySurface("https://twitter.com/home?lang=en"), "home");
  assert.equal(classifySurface("https://x.com/search?q=abc"), "search");
});

test("profile paths classify", () => {
  assert.equal(classifySurface("https://x.com/somereader"), "profile");
  assert.equal(classifySurface("https://x.com/somereader/with_replies"), "profile");
  assert.equal(classifySurface("https://x.com/somereader/likes"), "profile");
  assert.equal(classifySurface("https://x.com/somereader/media"), "profile");
});

test("a status path classifies as status", () => {
  assert.equal(classifySurface("https://x.com/somereader/status/123456789"), "status");
});

test("explore, messages, settings, and notifications are other", () => {
  assert.equal(classifySurface("https://x.com/explore"), "other");
  assert.equal(classifySurface("https://x.com/messages"), "other");
  assert.equal(classifySurface("https://x.com/settings"), "other");
  assert.equal(classifySurface("https://x.com/notifications"), "other");
});

test("a foreign host is other and is not liked", () => {
  assert.equal(classifySurface("https://example.com/home"), "other");
  const plan = planTick(view({ url: "https://example.com/home" }));
  assert.equal(plan.action, "skip_surface");
  assert.equal(plan.status, "unsupported_page");
  assert.equal(plan.waitMs, 2000);
  assert.equal(plan.postId, undefined);
});

test("a status page with no reply still likes the post when the toggle is off", () => {
  const settings = { ...defaultSettings(), likeOriginalInReplyThread: false };
  const plan = planTick(view({
    settings,
    url: "https://x.com/somereader/status/44444",
    posts: [{ id: "44444", liked: false, isReply: false }],
  }));
  assert.equal(plan.postId, "44444");
});

test("a reply thread with the toggle off skips the original and likes the reply", () => {
  const settings = { ...defaultSettings(), likeOriginalInReplyThread: false };
  const posts = [
    { id: "11111", liked: false, isReply: false },
    { id: "22222", liked: false, isReply: true },
  ];
  const plan = planTick(view({
    settings,
    url: "https://x.com/somereader/status/11111",
    posts,
  }));
  assert.equal(plan.postId, "22222");
});

test("a reply thread with the toggle on likes the original", () => {
  const posts = [
    { id: "11111", liked: false, isReply: false },
    { id: "22222", liked: false, isReply: true },
  ];
  const plan = planTick(view({
    url: "https://x.com/somereader/status/11111",
    posts,
  }));
  assert.equal(plan.postId, "11111");
});

test("home, profile, and search do not skip a reply card when the toggle is off", () => {
  const settings = { ...defaultSettings(), likeOriginalInReplyThread: false };
  for (const url of [
    "https://x.com/home",
    "https://x.com/somereader",
    "https://x.com/search?q=abc",
  ]) {
    const plan = planTick(view({
      settings,
      url,
      posts: [{ id: "33333", liked: false, isReply: true }],
    }));
    assert.equal(plan.postId, "33333");
  }
});

test("the original is the first post that is not a reply, even when a reply is above it", () => {
  const posts = [
    { id: "22222", liked: false, isReply: true },
    { id: "11111", liked: false, isReply: false },
    { id: "33333", liked: false, isReply: true },
  ];
  const marked = annotateThread(posts, "status");
  assert.equal(marked[0].role, "reply");
  assert.equal(marked[1].role, "original");
  assert.equal(marked[2].role, "reply");
  const settings = { ...defaultSettings(), likeOriginalInReplyThread: false };
  const plan = planTick(view({
    settings,
    url: "https://x.com/somereader/status/11111",
    posts,
  }));
  assert.equal(plan.postId, "22222");
});

test("when every post is a reply the first one is the original", () => {
  const posts = [
    { id: "55555", liked: false, isReply: true },
    { id: "66666", liked: false, isReply: true },
  ];
  const marked = annotateThread(posts, "status");
  assert.equal(marked[0].role, "original");
  assert.equal(marked[1].role, "reply");
  const settings = { ...defaultSettings(), likeOriginalInReplyThread: false };
  const plan = planTick(view({
    settings,
    url: "https://x.com/somereader/status/55555",
    posts,
  }));
  assert.equal(plan.postId, "66666");
});

test("no eligible post and no movement asks for a scroll", () => {
  const decision = scrollDecision({
    eligibleCount: 0,
    attemptedScroll: false,
    beforeScrollY: 10,
    afterScrollY: 10,
    previousIds: ["10001"],
    currentIds: ["10001"],
    backoffStep: 0,
  });
  assert.equal(decision.action, "scroll");
  const plan = planTick(view({
    posts: [{ id: "10001", liked: true, reposted: true, isReply: false }],
    scroll: {
      attemptedScroll: false,
      beforeScrollY: 10,
      afterScrollY: 10,
      previousIds: ["10001"],
      currentIds: ["10001"],
    },
  }));
  assert.equal(plan.action, "scroll");
  assert.equal(plan.status, "running");
  assert.equal(plan.scrollTarget, "document");
});

test("the popup shows one action for each session state", () => {
  assert.deepEqual(popupView(null), { action: "start", status: "Parado", tone: "idle" });
  assert.deepEqual(popupView({ status: "stopped", running: false }), {
    action: "start",
    status: "Parado",
    tone: "idle",
  });
  assert.deepEqual(popupView({ status: "running", running: true }), {
    action: "stop",
    status: "Curtindo",
    tone: "live",
  });
  assert.deepEqual(popupView({ status: "paused_inactive", running: true }), {
    action: "stop",
    status: "Pausado",
    tone: "paused",
  });
  assert.deepEqual(popupView({ status: "waiting_for_posts", running: true }), {
    action: "stop",
    status: "Aguardando novos posts",
    tone: "waiting",
  });
  assert.deepEqual(popupView({ status: "cap_reached", running: false }), {
    action: "start",
    status: "Limite da sessão atingido",
    tone: "idle",
  });
  assert.deepEqual(popupView({ status: "not_logged_in", running: true }), {
    action: "stop",
    status: "Entre no X nesta aba para começar",
    tone: "waiting",
  });
});

test("a fully visible post is not scrolled", () => {
  assert.deepEqual(likedPostScroll({ role: "post", top: 40, bottom: 400, viewportHeight: 800 }), {
    action: "none",
    element: "post",
  });
  assert.deepEqual(likedPostScroll({ role: "post", top: 0, bottom: 800, viewportHeight: 800 }), {
    action: "none",
    element: "post",
  });
});

test("the liked post is the element scrolled, not the like or repost button", () => {
  assert.deepEqual(likedPostScroll({ role: "like", top: 900, bottom: 940, viewportHeight: 800 }), {
    action: "none",
    element: null,
  });
  assert.deepEqual(likedPostScroll({ role: "repost", top: 900, bottom: 940, viewportHeight: 800 }), {
    action: "none",
    element: null,
  });
});

test("a post that fits is centered smoothly when it is not fully visible", () => {
  assert.deepEqual(likedPostScroll({ role: "post", top: 700, bottom: 980, viewportHeight: 800 }), {
    action: "scroll",
    element: "post",
    block: "center",
    behavior: "smooth",
  });
  assert.deepEqual(likedPostScroll({ role: "post", top: -120, bottom: 200, viewportHeight: 800 }), {
    action: "scroll",
    element: "post",
    block: "center",
    behavior: "smooth",
  });
});

test("a post taller than the screen stays on screen without centering", () => {
  assert.deepEqual(likedPostScroll({ role: "post", top: -40, bottom: 1600, viewportHeight: 800 }), {
    action: "scroll",
    element: "post",
    block: "nearest",
    behavior: "smooth",
  });
});

test("a scrollable document is the scroll target", () => {
  assert.equal(chooseScrollTarget({ documentScrollable: true, columnScrollable: true }), "document");
});

test("the column is used when the document cannot scroll", () => {
  assert.equal(chooseScrollTarget({ documentScrollable: false, columnScrollable: true }), "column");
});

test("neither scroller means no target and a stall wait", () => {
  assert.equal(chooseScrollTarget({ documentScrollable: false, columnScrollable: false }), "none");
  const plan = planTick(view({
    posts: [],
    scrollTarget: { documentScrollable: false, columnScrollable: false },
    scroll: {
      attemptedScroll: false,
      beforeScrollY: 0,
      afterScrollY: 0,
      previousIds: [],
      currentIds: [],
    },
  }));
  assert.equal(plan.action, "wait");
  assert.equal(plan.waitMs, 2000);
  assert.equal(plan.status, "waiting_for_posts");
});

test("a page that scrolled itself is observed for 500 ms", () => {
  const decision = scrollDecision({
    eligibleCount: 0,
    attemptedScroll: false,
    beforeScrollY: 0,
    afterScrollY: 400,
    previousIds: ["10001"],
    currentIds: ["10001"],
    backoffStep: 3,
  });
  assert.equal(decision.action, "observe");
  assert.equal(decision.nextBackoffStep, 0);
  assert.equal(decision.waitMs, 500);
});

test("a scroll that advances resets the backoff", () => {
  const decision = scrollDecision({
    eligibleCount: 0,
    attemptedScroll: true,
    beforeScrollY: 0,
    afterScrollY: 500,
    previousIds: ["10001"],
    currentIds: ["10001"],
    backoffStep: 2,
  });
  assert.equal(decision.action, "observe");
  assert.equal(decision.nextBackoffStep, 0);
  assert.equal(decision.waitMs, 500);
});

test("a new post id resets the backoff", () => {
  const decision = scrollDecision({
    eligibleCount: 0,
    attemptedScroll: true,
    beforeScrollY: 20,
    afterScrollY: 20,
    previousIds: ["10001"],
    currentIds: ["10001", "10002"],
    backoffStep: 4,
  });
  assert.equal(decision.action, "observe");
  assert.equal(decision.nextBackoffStep, 0);
});

test("stall waits follow 2000, 4000, 8000, 16000, then 30000", () => {
  const expected = [2000, 4000, 8000, 16000, 30000, 30000];
  expected.forEach((waitMs, step) => {
    const decision = scrollDecision({
      eligibleCount: 0,
      attemptedScroll: true,
      beforeScrollY: 5,
      afterScrollY: 5,
      previousIds: ["10001"],
      currentIds: ["10001"],
      backoffStep: step,
    });
    assert.equal(decision.action, "wait");
    assert.equal(decision.waitMs, waitMs);
    assert.equal(decision.nextBackoffStep, step + 1);
  });
});

test("a stall keeps the session running", () => {
  const session = { ...startSession(), likeCount: 30, backoffStep: 0 };
  const plan = planTick(view({
    session,
    posts: [],
    scroll: {
      attemptedScroll: true,
      beforeScrollY: 5,
      afterScrollY: 5,
      previousIds: [],
      currentIds: [],
    },
  }));
  const next = applyPlan(session, plan, defaultSettings());
  assert.equal(plan.action, "wait");
  assert.equal(plan.status, "waiting_for_posts");
  assert.equal(plan.waitMs, 2000);
  assert.equal(next.running, true);
  assert.equal(next.likeCount, 30);
  assert.equal(next.status, "waiting_for_posts");
});

test("start is refused unless the tab is X and the settings are valid", () => {
  assert.equal(canStart({ tabIsX: false, settingsOk: true }), false);
  assert.equal(canStart({ tabIsX: true, settingsOk: false }), false);
  assert.equal(canStart({ tabIsX: true, settingsOk: true }), true);
});

test("settings and session use the storage keys from the design", () => {
  assert.equal(SETTINGS_STORAGE_KEY, "settings");
  assert.equal(SESSION_STORAGE_KEY, "session");
});
