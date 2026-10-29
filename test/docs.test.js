// Documentation-set contract tests: the docs/ guides, repo hygiene files,
// issue/PR templates, and the CI workflow are treated exactly like the READMEs —
// file-as-contract. If a doc artifact is removed, emptied, or loses a documented
// invariant, the gate goes red. Every literal table is checked AGAINST the code
// (STATUS_MESSAGES, SETTINGS_ERRORS, defaultSettings, PAGE_RELOAD_MS, the language
// packs), so documentation can never drift from the shipped extension.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(new URL(rel, root), "utf8");

const readme = read("README.md");
const readmePt = read("README.pt-BR.md");
const policy = read("lib/policy.js");
const content = read("content/content.js");
const languages = read("lib/ui-languages.js");
const manifest = JSON.parse(read("manifest.json"));
const pkg = JSON.parse(read("package.json"));

const configDoc = () => read("docs/configuration.md");

// Returns the text of one `## ` section (title without the marker), or null.
function section(doc, title) {
  if (doc === null) return null;
  const start = doc.indexOf(`## ${title}`);
  if (start < 0) return null;
  const next = doc.indexOf("\n## ", start + 1);
  return next < 0 ? doc.slice(start) : doc.slice(start, next);
}

const slug = (heading) =>
  heading
    .toLowerCase()
    .replace(/[^a-zà-ú0-9 -]/g, "")
    .trim()
    .replace(/ /g, "-");

const DOC_FILES = [
  "docs/getting-started.md",
  "docs/configuration.md",
  "docs/architecture.md",
  "docs/behavior-and-limits.md",
  "docs/localization.md",
  "docs/faq.md",
  "docs/troubleshooting.md",
];

const statusEntries = () => {
  const block = policy.match(/const STATUS_MESSAGES = \{([\s\S]*?)\n\};/);
  assert.ok(block, "STATUS_MESSAGES shape changed — update this contract deliberately");
  return [...block[1].matchAll(/(\w+): "([^"]+)"/g)];
};

const settingsErrorEntries = () => {
  const block = policy.match(/const SETTINGS_ERRORS = \{([\s\S]*?)\n\};/);
  assert.ok(block, "SETTINGS_ERRORS shape changed — update this contract deliberately");
  return [...block[1].matchAll(/(\w+): "([^"]+)"/g)];
};

test("every docs/ guide exists, is substantive, and links back to the README", () => {
  for (const file of DOC_FILES) {
    assert.equal(existsSync(new URL(file, root)), true, file);
    const text = read(file);
    assert.ok(text.length > 1000, `${file} looks stub-sized`);
    assert.equal(text.includes("Back to README"), true, `${file} must link back`);
  }
});

test("the README status table and docs/configuration.md cover every STATUS_MESSAGES key and literal", () => {
  const entries = statusEntries();
  assert.equal(entries.length, 8);
  for (const [, key, message] of entries) {
    for (const [name, text] of [
      ["README.md", section(readme, "Status messages")],
      ["README.pt-BR.md", section(readmePt, "Mensagens de status")],
      ["docs/configuration.md", section(configDoc(), "Status messages")],
    ]) {
      assert.ok(text, `${name} must keep its status section`);
      assert.equal(text.includes(`\`${key}\``), true, `${name}: ${key}`);
      assert.equal(text.includes(message), true, `${name}: ${key} literal`);
    }
  }
});

test("docs/configuration.md lists every policy setting key with the code's default", () => {
  const config = section(configDoc(), "Settings reference");
  assert.ok(config, "docs/configuration.md must keep a Settings reference section");
  const defaults = {
    intervalSeconds: "intervalSeconds: 5",
    capEnabled: "capEnabled: false",
    cap: "cap: 100",
    likeOriginalInReplyThread: "likeOriginalInReplyThread: true",
    alsoRepost: "alsoRepost: true",
    interfaceLanguage: 'interfaceLanguage: "pt-BR"',
  };
  for (const [key, codePattern] of Object.entries(defaults)) {
    assert.equal(config.includes(`\`${key}\``), true, key);
    assert.equal(policy.includes(codePattern), true, `policy default ${key}`);
  }
  assert.equal(config.includes("1 – 60"), true);
  assert.equal(config.includes("1 – 1,000,000"), true);
});

test("docs/configuration.md quotes the exact validation messages from SETTINGS_ERRORS", () => {
  const text = configDoc();
  const entries = settingsErrorEntries();
  assert.equal(entries.length, 2);
  for (const [, , message] of entries) {
    assert.equal(text.includes(message), true, message);
  }
});

test("docs/configuration.md's supported-pages table names both hosts and all four surfaces", () => {
  const pages = section(configDoc(), "Supported pages");
  assert.ok(pages, "docs/configuration.md must keep a Supported pages section");
  for (const host of ["x.com", "twitter.com"]) {
    assert.equal(pages.includes(`\`${host}\``), true, host);
  }
  for (const surface of ["Home timeline", "Search results", "Profile", "Single post"]) {
    assert.equal(pages.includes(surface), true, surface);
  }
  assert.equal(pages.includes("/status/"), true);
});

test("the README settings table lists every policy key and points to docs/configuration.md", () => {
  const settings = section(readme, "Settings reference");
  assert.ok(settings, "README must keep a Settings reference section");
  for (const key of [
    "intervalSeconds",
    "capEnabled",
    "cap",
    "likeOriginalInReplyThread",
    "alsoRepost",
    "interfaceLanguage",
  ]) {
    assert.equal(settings.includes(`\`${key}\``), true, key);
  }
  assert.equal(settings.includes("(docs/configuration.md)"), true);
});

test("docs/architecture.md documents the reload budget exactly as the code computes it", () => {
  const text = read("docs/architecture.md");
  assert.equal(text.includes("sequenceDiagram"), true);
  assert.equal(text.includes("planTick"), true);
  assert.equal(text.includes("applyPlan"), true);
  assert.equal(text.includes("PAGE_RELOAD_MS"), true);
  const reloadMs = Function(`return (${policy.match(/PAGE_RELOAD_MS = ([^;]+);/)[1]})`)();
  assert.equal(reloadMs, 300000);
  assert.equal(text.includes(String(reloadMs)), true, `PAGE_RELOAD_MS=${reloadMs} in doc`);
  assert.equal(text.includes("sessionStorage"), true);
  const marker = content.match(/TAB_SESSION_MARKER = "([^"]+)"/)[1];
  assert.equal(text.includes(marker), true, "resume marker documented");
});

test("docs/architecture.md documents the repost retry ladder with the real constants", () => {
  const text = read("docs/architecture.md");
  const retries = Number(content.match(/REPOST_RETRIES = (\d+)/)[1]);
  assert.equal(retries, 3);
  assert.equal(text.includes("REPOST_RETRIES"), true);
  assert.equal(text.includes(`REPOST_RETRIES = ${retries}`), true);
  assert.equal(text.includes("OBSERVE_WAIT_MS"), true);
  assert.equal(text.includes("retweetConfirm"), true);
});

test("docs/behavior-and-limits.md keeps the full safety catalog", () => {
  const text = read("docs/behavior-and-limits.md");
  assert.equal(text.includes("Never unlikes"), true);
  assert.equal(text.includes("Unknown state is never clicked"), true);
  assert.equal(text.includes("NEVER_QUOTE"), true);
  assert.equal(text.includes("chrome.storage.session"), true);
  assert.equal(text.includes("No data export, no multi-tab orchestration"), true);
  assert.equal(text.includes("This exists because X's SPA") || text.includes("housekeeping reload"), true);
});

test("docs/localization.md keeps the sourced message ids and the language count from the code", () => {
  const text = read("docs/localization.md");
  for (const id of ["d636ebc6", "eb3a8b0c", "f2919fb8", "fd1e5446", "bb5c5864"]) {
    assert.equal(text.includes(id), true, id);
  }
  const count = [...languages.matchAll(/^    id: "([^"]+)"/gm)].length;
  assert.ok(count >= 40, `expected a broad pack list, found ${count}`);
  assert.equal(text.includes(String(count)), true, `${count} languages documented`);
  assert.equal(text.includes("knownLanguage"), true);
  assert.equal(text.includes("NEVER_QUOTE"), true);
});

test("docs/faq.md answers the account-safety and presence questions", () => {
  const text = read("docs/faq.md");
  assert.equal(text.includes("Esta solicitação parece ser automatizada"), true);
  assert.equal(text.includes("Do I need to keep the tab open?"), true);
  assert.equal(text.includes("Will it undo my likes by accident?"), true);
  assert.equal(text.includes("presence is the switch"), true);
});

test("docs/troubleshooting.md carries the full row catalog", () => {
  const text = read("docs/troubleshooting.md");
  const rows = text
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| Symptom") && !line.startsWith("|---"));
  assert.ok(rows.length >= 15, `expected >=15 rows, found ${rows.length}`);
  assert.equal(text.includes("chrome://extensions"), true);
  assert.equal(text.includes("Idioma da interface"), true);
  assert.equal(text.includes("AUTOMATION_WAIT_MS"), true);
});

test("docs/getting-started.md installs on all three browsers and reaches Iniciar", () => {
  const text = read("docs/getting-started.md");
  for (const page of ["chrome://extensions", "brave://extensions", "edge://extensions"]) {
    assert.equal(text.includes(page), true, page);
  }
  assert.equal(text.includes("Load unpacked"), true);
  assert.equal(text.includes("Iniciar"), true);
  assert.equal(text.includes("checklist"), true);
});

test("the README badge row carries license, MV3, no-build, version, tests, and CI badges", () => {
  assert.equal(readme.includes("img.shields.io/badge/License-MIT"), true);
  assert.equal(readme.includes("Manifest%20V3"), true);
  assert.equal(readme.includes("no%20build%20step"), true);
  assert.equal(readme.includes(`version-${manifest.version}`), true);
  assert.match(readme, /img\.shields\.io\/badge\/tests-\d+--passing-brightgreen/);
  assert.equal(
    readme.includes(
      "[![CI](https://github.com/paladini/x-likes-automator/actions/workflows/test.yml/badge.svg)]"
      + "(https://github.com/paladini/x-likes-automator/actions/workflows/test.yml)",
    ),
    true,
  );
});

test("the README table of contents exactly mirrors its sections: every anchor resolves and every heading is listed", () => {
  const toc = section(readme, "Table of contents");
  assert.ok(toc, "README must keep a Table of contents section");
  const headings = [...readme.matchAll(/^## (.+)$/gm)].map((m) => slug(m[1].trim()));
  const entries = [...toc.matchAll(/\[([^\]]+)\]\(#([^)]+)\)/g)];
  assert.ok(entries.length >= 10, `TOC should list the whole document (found ${entries.length})`);
  const anchors = new Set(entries.map(([, , anchor]) => anchor));
  for (const anchor of anchors) {
    assert.equal(headings.includes(anchor), true, `TOC anchor #${anchor} has no heading`);
  }
  for (const heading of headings) {
    if (heading === "table-of-contents") continue;
    assert.equal(anchors.has(heading), true, `heading "${heading}" is missing from the TOC`);
  }
});

test("the pt-BR README's table of contents resolves against its own headings", () => {
  const toc = section(readmePt, "Sumário");
  assert.ok(toc, "README.pt-BR.md must keep a Sumário section");
  const headings = [...readmePt.matchAll(/^## (.+)$/gm)].map((m) => slug(m[1].trim()));
  const anchors = new Set([...toc.matchAll(/\[([^\]]+)\]\(#([^)]+)\)/g)].map(([, , a]) => a));
  for (const anchor of anchors) {
    assert.equal(headings.includes(anchor), true, `Sumário anchor #${anchor} has no heading`);
  }
});

test("the README links the hygiene files and every docs/ guide", () => {
  for (const link of [
    "(docs/getting-started.md)",
    "(docs/configuration.md)",
    "(docs/architecture.md)",
    "(docs/behavior-and-limits.md)",
    "(docs/localization.md)",
    "(docs/faq.md)",
    "(docs/troubleshooting.md)",
    "(CONTRIBUTING.md)",
    "(CHANGELOG.md)",
    "(SECURITY.md)",
    "(CODE_OF_CONDUCT.md)",
    "(.github/workflows/test.yml)",
  ]) {
    assert.equal(readme.includes(link), true, link);
  }
});

test("both READMEs advertise the same shipped version with matching test-count badges", () => {
  assert.equal(manifest.version, pkg.version, "manifest and package must ship in lockstep");
  const changelog = read("CHANGELOG.md");
  assert.ok(changelog.includes(`## [${manifest.version}]`), "CHANGELOG must open with the shipped version");
  assert.ok(readme.includes(manifest.version));
  assert.ok(readmePt.includes(manifest.version));
  const enBadge = readme.match(/badge\/tests-(\d+)--passing/);
  const ptBadge = readmePt.match(/badge\/testes-(\d+)--passando/);
  assert.ok(enBadge, "English tests badge missing");
  assert.ok(ptBadge, "Portuguese testes badge missing");
  assert.equal(enBadge[1], ptBadge[1], "the two READMEs must claim the same suite size");
});

test("the pt-BR README mirrors the English structure and enumerates every docs/ guide", () => {
  const enH2 = [...readme.matchAll(/^## /gm)].length;
  const ptH2 = [...readmePt.matchAll(/^## /gm)].length;
  assert.equal(ptH2, enH2, "the two READMEs must keep identical section counts");
  assert.equal(readmePt.includes("[English](README.md)"), true);
  assert.equal(readmePt.includes("em inglês"), true); // docs/ language note
  for (const file of DOC_FILES) {
    assert.equal(readmePt.includes(file), true, file);
  }
});

test("CHANGELOG follows Keep a Changelog and lists every release with dates", () => {
  const changelog = read("CHANGELOG.md");
  assert.equal(changelog.includes("Keep a Changelog"), true);
  assert.equal(changelog.includes("Semantic Versioning"), true);
  assert.equal(changelog.includes("## [1.1.0] - 2026-10-29"), true);
  assert.equal(changelog.includes("## [1.0.0] - 2026-10-24"), true);
  assert.equal(changelog.includes("### Added"), true);
  const order = ["1.1.0", "1.0.0"].map((v) => changelog.indexOf(`## [${v}]`));
  for (let i = 1; i < order.length; i++) {
    assert.ok(order[i - 1] >= 0 && order[i] > order[i - 1], `release order broken at ${i}`);
  }
});

test("CONTRIBUTING states the Node requirement, the test gate, and the conventions", () => {
  const contributing = read("CONTRIBUTING.md");
  assert.equal(contributing.includes("Node.js 20"), true);
  assert.equal(contributing.includes("npm test"), true);
  assert.equal(contributing.includes("node --test"), true);
  assert.equal(contributing.includes("Conventional Commits"), true);
  assert.equal(contributing.includes("Every behavior change adds"), true);
  assert.equal(contributing.includes("file-as-contract"), true);
  assert.equal(contributing.includes("Repository layout"), true);
  assert.equal(contributing.includes("repost-menu.html"), true);
});

test("SECURITY.md describes private reporting and CODE_OF_CONDUCT.md is Contributor Covenant 1.4", () => {
  const security = read("SECURITY.md");
  assert.equal(security.includes("vulnerability"), true);
  assert.equal(security.toLowerCase().includes("privately"), true);
  assert.equal(security.includes("Do not open a public issue"), true);
  const coc = read("CODE_OF_CONDUCT.md");
  assert.equal(coc.includes("Contributor Covenant"), true);
  assert.equal(coc.includes("version 1.4"), true);
});

test("the CI workflow runs npm test on a Node 20.x/22.x matrix across Ubuntu and Windows", () => {
  const workflow = read(".github/workflows/test.yml");
  assert.equal(workflow.includes("name: Test"), true);
  assert.equal(workflow.includes("push"), true);
  assert.equal(workflow.includes("pull_request"), true);
  assert.equal(workflow.includes("branches: [main]"), true);
  assert.equal(workflow.includes("node-version: ['20.x', '22.x']"), true);
  assert.equal(workflow.includes("os: [ubuntu-latest, windows-latest]"), true);
  assert.equal(workflow.includes("actions/checkout"), true);
  assert.equal(workflow.includes("actions/setup-node"), true);
  assert.equal(workflow.includes("npm test"), true);
});

test("issue and pull-request templates exist with the required checklist items", () => {
  const bug = read(".github/ISSUE_TEMPLATE/bug_report.md");
  assert.equal(bug.includes("name: Bug report"), true);
  assert.equal(bug.toLowerCase().includes("reproduction"), true);
  assert.equal(bug.includes("Idioma da interface"), true);
  const feature = read(".github/ISSUE_TEMPLATE/feature_request.md");
  assert.equal(feature.includes("name: Feature request"), true);
  assert.equal(feature.includes("pacing"), true);
  const config = read(".github/ISSUE_TEMPLATE/config.yml");
  assert.equal(config.includes("blank_issues_enabled"), true);
  const pr = read(".github/pull_request_template.md");
  assert.equal(pr.includes("- [ ]"), true);
  assert.equal(pr.includes("npm test"), true);
});
