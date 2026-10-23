import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../popup/popup.html", import.meta.url), "utf8");

test("the popup language is Brazilian Portuguese", () => {
  assert.match(html, /<html[^>]*lang="pt-BR"/);
});

test("interval, cap, and original-post controls have labels", () => {
  assert.match(html, /<label[^>]*for="interval"/);
  assert.match(html, /<label[^>]*for="cap"/);
  assert.match(html, /<label[^>]*for="like-original"/);
  assert.match(html, /id="interval"/);
  assert.match(html, /id="cap"/);
  assert.match(html, /id="like-original"/);
});

test("start and stop are buttons", () => {
  assert.match(html, /<button[^>]*id="start"[^>]*>/);
  assert.match(html, /<button[^>]*id="stop"[^>]*>/);
  assert.equal(html.includes("onclick="), false);
});

test("the status region is a polite live region", () => {
  assert.match(html, /id="status"[^>]*aria-live="polite"/);
});

test("the count line uses the session prefix", () => {
  assert.equal(html.includes("Curtidas nesta sessão:"), true);
});
