import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../popup/popup.css", import.meta.url), "utf8");

test("the popup background is #12141a and the text is #f4f1ea", () => {
  assert.match(css, /--bg:\s*#12141a\b/);
  assert.match(css, /--text:\s*#f4f1ea\b/);
  assert.match(css, /background:\s*var\(--bg\)/);
  assert.match(css, /(?:^|\s)color:\s*var\(--text\)/);
  assert.equal(/--bg:\s*#f4f1ea\b/.test(css), false);
  assert.equal(/--text:\s*#12141a\b/.test(css), false);
});

test("the running control is distinct from the start button", () => {
  assert.match(css, /#stop\s*\{[^}]*background:\s*transparent;/s);
  assert.match(css, /#stop\s*\{[^}]*border-color:\s*var\(--amber\);/s);
  assert.match(css, /#stop\[data-state="running"\]::before\s*\{[^}]*animation:\s*live-pulse/s);
});

test("keyboard focus has a visible outline", () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline\s*:/s);
});
