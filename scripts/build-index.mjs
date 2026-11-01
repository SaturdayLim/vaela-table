// Build step (local and CI): copy story/*.md and sealed/*.json into public/content/ and write
// public/content/index.json, which the app polls for new posts. Needs no secrets.
import { readFile, writeFile, readdir, mkdir, rm, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "content");

const list = async (dir, ext) => (existsSync(dir) ? (await readdir(dir)).filter((f) => f.endsWith(ext)).sort() : []);

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, "story"), { recursive: true });
await mkdir(join(OUT, "sealed"), { recursive: true });

const hash = createHash("sha256");
const story = [];
for (const file of await list(join(ROOT, "story"), ".md")) {
  const text = await readFile(join(ROOT, "story", file), "utf8");
  const h1 = text.split(/\r?\n/).find((l) => l.startsWith("# "));
  story.push({ id: file.replace(/\.md$/, ""), title: h1 ? h1.slice(2).trim() : file, file: `story/${file}` });
  await copyFile(join(ROOT, "story", file), join(OUT, "story", file));
  hash.update(file).update(text);
}
story.reverse(); // newest first

const inboxes = [];
for (const file of await list(join(ROOT, "sealed"), ".json")) {
  const text = await readFile(join(ROOT, "sealed", file), "utf8");
  const sealed = JSON.parse(text);
  // salt changes on every reseal, so the app can tell an inbox changed even when no letter was added (a roll log line).
  inboxes.push({ slug: sealed.slug, name: sealed.name, letters: sealed.letters, newest: sealed.newest, salt: sealed.salt, file: `sealed/${file}` });
  await copyFile(join(ROOT, "sealed", file), join(OUT, "sealed", file));
  hash.update(file).update(text);
}

const index = { rev: hash.digest("hex").slice(0, 16), built: new Date().toISOString(), story, inboxes };
await writeFile(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`content: ${story.length} post(s), ${inboxes.length} inbox(es), rev ${index.rev}`);
