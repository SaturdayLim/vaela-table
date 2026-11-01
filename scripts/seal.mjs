// Seal each player's inbox from private/<slug>/ into sealed/<slug>.json. Runs on the DM's machine only:
// private/ (plaintext letters, sheets, codes) is gitignored and never leaves it.
//
//   private/<slug>/player.json   { "name": "Danny Fenwick" }
//   private/<slug>/sheet.md      the finished sheet (optional)
//   private/<slug>/letters/*.md  one file per letter, sorted by name (001-, 002-, ...)
//   private/codes.json           { "<slug>": "XXXX-XXXX-XXXX" }  (a code is generated if missing)
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

// Crockford base32 without I, L, O, U: easy to read aloud and to type on a phone.
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ0123456789";
function newCode() {
  const groups = [];
  for (let g = 0; g < 3; g++) {
    let s = "";
    for (let i = 0; i < 4; i++) s += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(s);
  }
  return groups.join("-");
}

function splitPost(text, fallback) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const i = lines.findIndex((l) => l.startsWith("# "));
  if (i < 0) return { title: fallback, body: text.trim() };
  return { title: lines[i].slice(2).trim(), body: lines.slice(i + 1).join("\n").trim() };
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
  if (!codes[slug]) {
    codes[slug] = newCode();
    console.log(`${slug}: new inbox code generated, stored in private/codes.json`);
  }
  const items = [];
  if (existsSync(join(dir, "sheet.md"))) {
    items.push({ id: "sheet", kind: "sheet", ...splitPost(await readFile(join(dir, "sheet.md"), "utf8"), name) });
  }
  if (existsSync(join(dir, "rolls.md"))) {
    items.push({ id: "rolls", kind: "rolls", ...splitPost(await readFile(join(dir, "rolls.md"), "utf8"), "Your rolls") });
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
