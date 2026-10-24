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

test("an x.com content script with a bare import must be loaded as a module", () => {
  const script = manifest.content_scripts.find((entry) =>
    (entry.matches || []).some((match) => match.includes("x.com")),
  );
  assert.ok(script);
  const sources = script.js.map((file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
  const bareModuleSyntax = sources.some((source) => /^\s*(import|export)\s/m.test(source));
  if (bareModuleSyntax) {
    assert.equal(script.type, "module");
  } else {
    assert.notEqual(script.type, "module");
  }
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
