import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const license = readFileSync(new URL("../LICENSE", import.meta.url), "utf8");

test("the README has a Portuguese section and an English section", () => {
  assert.equal(readme.includes("## Português"), true);
  assert.equal(readme.includes("## English"), true);
});

test("the README explains the open tab, unpacked load, settings, author, MIT, and the rules note", () => {
  assert.equal(readme.includes("https://github.com/paladini/x-likes-automator"), true);
  assert.equal(readme.includes("aba do X"), true);
  assert.equal(readme.includes("tab you already have open"), true);
  assert.equal(readme.includes("chrome://extensions"), true);
  assert.equal(readme.includes("brave://extensions"), true);
  assert.equal(readme.includes("Carregar sem compactação"), true);
  assert.equal(readme.includes("Load unpacked"), true);
  assert.equal(readme.includes("Intervalo entre curtidas"), true);
  assert.equal(readme.includes("Sem limite de curtidas"), true);
  assert.equal(readme.includes("limite opcional"), true);
  assert.equal(readme.includes("post original em uma thread de resposta"), true);
  assert.equal(readme.includes("Interval between likes"), true);
  assert.equal(readme.includes("Unlimited likes"), true);
  assert.equal(readme.includes("optional cap"), true);
  assert.equal(readme.includes("original post in a reply thread"), true);
  assert.equal(readme.includes("Fernando Paladini"), true);
  assert.equal(readme.includes("MIT"), true);
  assert.equal(readme.includes("podem entrar em conflito com as regras do X"), true);
  assert.equal(readme.includes("Você é responsável pelo uso."), true);
  assert.equal(readme.includes("can conflict with X's rules"), true);
  assert.equal(readme.includes("You are responsible for how you use this extension."), true);
});

test("the LICENSE is MIT and names Fernando Paladini", () => {
  assert.equal(license.includes("MIT License"), true);
  assert.equal(license.includes("Fernando Paladini"), true);
  assert.equal(license.includes("Copyright (c) 2026 Fernando Paladini"), true);
});
