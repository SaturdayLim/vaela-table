// Leak check: no line of a private letter or sheet may appear in any file git would publish
// (tracked or untracked-but-not-ignored), nor in the built site. Run before every push.
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRIVATE = join(ROOT, "private");

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

// Distinctive lines only: markdown stripped, at least 24 characters.
const needles = [];
for (const file of (await walk(PRIVATE)).filter((f) => f.endsWith(".md"))) {
  for (const raw of (await readFile(file, "utf8")).split(/\r?\n/)) {
    const line = raw.replace(/[*_`#>|]/g, "").replace(/\s+/g, " ").trim();
    if (line.length >= 24) needles.push({ file, line });
  }
}
const codes = existsSync(join(PRIVATE, "codes.json")) ? Object.values(JSON.parse(await readFile(join(PRIVATE, "codes.json"), "utf8"))) : [];

const published = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" })
  .split("\n").filter(Boolean).map((f) => join(ROOT, f));
const built = (await walk(join(ROOT, "dist"))).concat(await walk(join(ROOT, "public", "content")));

const hits = [];
for (const file of [...new Set([...published, ...built])]) {
  if (!existsSync(file) || (await stat(file)).size > 5_000_000) continue;
  if (/\.(png|woff2|ico|jpg)$/i.test(file)) continue;
  const text = (await readFile(file, "utf8")).replace(/[*_`#>|]/g, "").replace(/\s+/g, " ");
  for (const n of needles) if (text.includes(n.line)) hits.push(`${file}: "${n.line.slice(0, 40)}..."`);
  for (const c of codes) if (text.includes(c)) hits.push(`${file}: contains an inbox code`);
}

if (hits.length) {
  console.error(`LEAK: ${hits.length} private line(s) found in publishable files:`);
  for (const h of hits.slice(0, 20)) console.error("  " + h);
  process.exit(1);
}
console.log(`leak check: ${needles.length} private line(s) checked against ${published.length + built.length} file(s), none found`);
