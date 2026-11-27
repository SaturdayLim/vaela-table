// Render the Table's brand files from the source art in ../design/brand/ (Mike's logo suite, 2026-11-27).
// The emblem (gilded V) gives the app icons (wide crop, with wings) and the favicon and header mark (tight crop).
// The wordmark banner is cropped for the opening book. Run: node scripts/make-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
const at = (p) => fileURLToPath(new URL(p, import.meta.url));
const emblem = at("../../design/brand/vaela-emblem-source.webp");
const wordmark = at("../../design/brand/vaela-wordmark-source.webp");
const wide = { left: 344, top: 24, width: 720, height: 720 };
const tight = { left: 414, top: 80, width: 580, height: 580 };
for (const [size, name] of [[192, "icon-192.png"], [512, "icon-512.png"], [180, "apple-touch-icon.png"]]) {
  await sharp(emblem).extract(wide).resize(size, size).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(at(`../public/${name}`));
}
await sharp(emblem).extract(tight).resize(48, 48).png().toFile(at("../public/favicon.png"));
await sharp(emblem).extract(tight).resize(96, 96).webp({ quality: 85 }).toFile(at("../public/brand/vaela-mark.webp"));
await sharp(emblem).extract(wide).resize(480, 480).webp({ quality: 82 }).toFile(at("../public/brand/vaela-emblem.webp"));
await sharp(wordmark).extract({ left: 200, top: 70, width: 1010, height: 600 }).resize(808).webp({ quality: 82 }).toFile(at("../public/brand/vaela-wordmark.webp"));
console.log("brand files written");
