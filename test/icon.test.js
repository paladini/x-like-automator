import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function read(path) {
  return readFileSync(new URL(path, root));
}

function pngSize(buffer) {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("icon.svg is an original svg and does not name another extension", () => {
  const svg = read("icons/icon.svg").toString("utf8");
  assert.match(svg, /<svg\b/);
  assert.equal(svg.includes("hodmfcalhhmoaldjlcoobgjjppajbcoe"), false);
  assert.equal(svg.toLowerCase().includes("x liker"), false);
});

test("committed png icons match the manifest sizes", () => {
  const manifest = JSON.parse(read("manifest.json").toString("utf8"));
  const expected = {
    "icons/icon-16.png": 16,
    "icons/icon-32.png": 32,
    "icons/icon-48.png": 48,
    "icons/icon-128.png": 128,
  };
  for (const [path, size] of Object.entries(expected)) {
    const actual = pngSize(read(path));
    assert.equal(actual.width, size);
    assert.equal(actual.height, size);
  }
  for (const path of Object.values(manifest.icons)) {
    assert.equal(pngSize(read(path)).width > 0, true);
  }
});
