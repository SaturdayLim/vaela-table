// Seal each player's inbox from private/<slug>/ into sealed/<slug>.json. Runs on the DM's machine only:
// private/ (plaintext letters, sheets, codes) is gitignored and never leaves it.
//
//   private/<slug>/player.json   { "name": "Danny Fenwick" }
//   private/<slug>/sheet.md      the finished sheet (optional)
//   private/<slug>/letters/*.md  one file per letter, sorted by name (001-, 002-, ...)
//   private/codes.json           { "<slug>": "K7QF4M" }  (a code is generated if missing)
//
//   node scripts/seal.mjs --new-code seur,danny   replaces those players' codes (their old code stops working)
//
// An inbox is resealed only when its content or code changes, so unchanged inboxes make no git diff.
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash, randomInt } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sealInbox } from "../src/lib/crypto.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRIVATE = join(ROOT, "private");
const SEALED = join(ROOT, "sealed");

// 6 characters, no 0, O, 1, I, L or J: easy to read aloud and to type on a phone (Mike, 2026-11-27).
const ALPHABET = "ABCDEFGHKMNPQRSTUVWXYZ23456789";
function newCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

const flag = process.argv.indexOf("--new-code");
const renew = new Set(flag > -1 ? (process.argv[flag + 1] ?? "").split(",").filter(Boolean) : []);

function splitPost(text, fallback) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const i = lines.findIndex((l) => l.startsWith("# "));
  if (i < 0) return { title: fallback, body: text.trim() };
  return { title: lines[i].slice(2).trim(), body: lines.slice(i + 1).join("\n").trim() };
}

// private/<slug>/pack.json (written by `table.py pack` and `table.py item`) as the player sees it.
const cell = (s) => String(s ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
const VERB = { use: "Used", lose: "Lost", gain: "Gained" };
function packMarkdown(pack) {
  const items = pack.items ?? [];
  const rows = items.map((i) => `| ${cell(i.name)} | ${i.qty} | ${cell(i.note)} |`);
  const recent = (pack.log ?? []).filter((l) => VERB[l.change]).slice(-8).reverse()
    .map((l) => `- Turn ${l.turn}: ${VERB[l.change]} ${l.qty} x ${cell(l.item)}${l.reason ? ` (${cell(l.reason)})` : ""}`);
  return "Locked: only what is listed here exists. The DM records every change.\n\n" +
    (items.length ? `| Item | Qty | Note |\n|---|---|---|\n${rows.join("\n")}` : "Empty.") +
    (recent.length ? `\n\n**Recent changes**\n\n${recent.join("\n")}` : "");
}

// The profile: the character's numbers only, for the app's Profile page (src/enhance.ts profileHtml).
// Scores, saves and skills come from stats.json; HP, AC and the rest from a sheet table with Stat and Value columns.
function profileOf(stats, sheet) {
  const derived = [];
  const lines = sheet.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length - 2; i++) {
    const head = lines[i].split("|").map((c) => c.trim()).filter(Boolean);
    if (head[0]?.toLowerCase() !== "stat" || head[head.length - 1]?.toLowerCase() !== "value" || !/^\|?\s*-/.test(lines[i + 1])) continue;
    for (let j = i + 2; j < lines.length && lines[j].trim().startsWith("|"); j++) {
      const cells = lines[j].split("|").slice(1, -1).map((c) => c.trim());
      const raw = cells[cells.length - 1] ?? "";
      const bold = raw.match(/\*\*([^*]+)\*\*/);
      const value = (bold ? bold[1] : raw.split(" (")[0]).replace(/\*/g, "").trim();
      if (cells[0] && value) derived.push({ stat: cells[0].replace(/\*/g, ""), value });
    }
    break;
  }
  return { name: stats.name ?? "", cls: stats.class ?? "", level: stats.level ?? 0, pb: stats.pb ?? 2,
    abilities: stats.abilities ?? {}, saves: stats.saves ?? [], skills: stats.skills ?? [], expertise: stats.expertise ?? [], derived };
}

async function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(await readFile(path, "utf8")) : fallback;
}

const codes = await readJson(join(PRIVATE, "codes.json"), {});
const hashes = await readJson(join(PRIVATE, "hashes.json"), {});
await mkdir(SEALED, { recursive: true });

const slugs = (await readdir(PRIVATE, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && existsSync(join(PRIVATE, d.name, "player.json")))
  .map((d) => d.name)
  .sort();

for (const slug of slugs) {
  const dir = join(PRIVATE, slug);
  const { name } = await readJson(join(dir, "player.json"), {});
  if (!codes[slug] || renew.has(slug)) {
    codes[slug] = newCode();
    console.log(`${slug}: new inbox code generated, stored in private/codes.json`);
  }
  const items = [];
  if (existsSync(join(dir, "sheet.md"))) {
    items.push({ id: "sheet", kind: "sheet", ...splitPost(await readFile(join(dir, "sheet.md"), "utf8"), name) });
  }
  if (existsSync(join(dir, "stats.json"))) {
    const sheetText = existsSync(join(dir, "sheet.md")) ? await readFile(join(dir, "sheet.md"), "utf8") : "";
    items.push({ id: "profile", kind: "profile", title: "Profile", body: JSON.stringify(profileOf(await readJson(join(dir, "stats.json"), {}), sheetText)) });
  }
  if (existsSync(join(dir, "pack.json"))) {
    items.push({ id: "pack", kind: "pack", title: "Your pack", body: packMarkdown(await readJson(join(dir, "pack.json"), {})) });
  }
  if (existsSync(join(dir, "rolls.md"))) {
    items.push({ id: "rolls", kind: "rolls", ...splitPost(await readFile(join(dir, "rolls.md"), "utf8"), "Your rolls") });
  }
  if (existsSync(join(dir, "asides.md"))) {
    items.push({ id: "asides", kind: "asides", ...splitPost(await readFile(join(dir, "asides.md"), "utf8"), "Asides with the DM") });
  }
  const letterDir = join(dir, "letters");
  const letters = existsSync(letterDir) ? (await readdir(letterDir)).filter((f) => f.endsWith(".md")).sort() : [];
  for (const file of letters) {
    items.push({ id: file.replace(/\.md$/, ""), kind: "letter", ...splitPost(await readFile(join(letterDir, file), "utf8"), file) });
  }

  const hash = createHash("sha256").update(JSON.stringify({ name, code: codes[slug], items })).digest("hex");
  const out = join(SEALED, `${slug}.json`);
  if (hashes[slug] === hash && existsSync(out)) {
    console.log(`${slug}: unchanged`);
    continue;
  }
  const sealed = await sealInbox({ slug, name, code: codes[slug], items });
  await writeFile(out, JSON.stringify(sealed, null, 2) + "\n");
  hashes[slug] = hash;
  console.log(`${slug}: sealed ${items.length} item(s), ${sealed.letters} letter(s)`);
}

await writeFile(join(PRIVATE, "codes.json"), JSON.stringify(codes, null, 2) + "\n");
await writeFile(join(PRIVATE, "hashes.json"), JSON.stringify(hashes, null, 2) + "\n");
