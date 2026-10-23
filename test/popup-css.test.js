import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../popup/popup.css", import.meta.url), "utf8");

test("the popup declares the dark background and the text color", () => {
  assert.equal(css.includes("#12141a"), true);
  assert.equal(css.includes("#f4f1ea"), true);
});

test("keyboard focus has a visible outline", () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline\s*:/s);
});
