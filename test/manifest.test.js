import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));

test("manifest is version 3", () => {
  assert.equal(manifest.manifest_version, 3);
});

test("content scripts run on x.com and twitter.com", () => {
  assert.deepEqual(manifest.content_scripts[0].matches, [
    "https://x.com/*",
    "https://twitter.com/*",
  ]);
  assert.deepEqual(manifest.content_scripts[0].js, [
    "lib/ui-languages.js",
    "lib/policy.js",
    "content/content.js",
  ]);
});

test("classic content and popup scripts do not use import or export", () => {
  const moduleSyntax = /^\s*(import|export)\s/m;
  const popupHtml = readFileSync(new URL("../popup/popup.html", import.meta.url), "utf8");
  const classicFiles = [];

  for (const entry of manifest.content_scripts || []) {
    if (entry.type === "module") continue;
    for (const file of entry.js || []) classicFiles.push(file);
  }

  for (const match of popupHtml.matchAll(/<script\b([^>]*)>/gi)) {
    const attrs = match[1];
    if (/\btype\s*=\s*["']module["']/i.test(attrs)) continue;
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!src) continue;
    const relative = src[1].startsWith("../") ? src[1].slice(3) : `popup/${src[1]}`;
    classicFiles.push(relative);
  }

  assert.ok(classicFiles.length > 0);
  for (const file of classicFiles) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.equal(moduleSyntax.test(source), false, file);
  }
  assert.equal(popupHtml.includes("runtime.sendMessage"), false);
  const popupSource = readFileSync(new URL("../popup/popup.js", import.meta.url), "utf8");
  assert.equal(popupSource.includes("runtime.sendMessage"), false);
  assert.equal(popupSource.includes("tabsApi.sendMessage"), true);
});

test("permissions are storage only", () => {
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.equal(manifest.permissions.includes("cookies"), false);
  assert.equal(manifest.permissions.includes("identity"), false);
  assert.equal(JSON.stringify(manifest).includes("api.x.com"), false);
});

test("host permissions are the two X origins", () => {
  assert.deepEqual(manifest.host_permissions, ["https://x.com/*", "https://twitter.com/*"]);
});

test("manifest icons point at PNG files and not the SVG", () => {
  const paths = [
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
  ];
  assert.ok(paths.length >= 4);
  for (const path of paths) {
    assert.match(path, /\.png$/);
    assert.equal(path.endsWith(".svg"), false);
  }
  assert.equal(JSON.stringify(manifest).includes("icon.svg"), false);
});
