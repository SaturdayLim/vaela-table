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

// Faction emblems (Mike's mapping, 2026-11-28) as single-ink masks: white where the emblem is, transparent elsewhere.
// CSS paints them with mask-image, so they take the theme's ink in light and dark mode.
const setA = at("../../design/brand/emblems-set-a.webp"); // gold line art on navy: bright = ink
const setB = at("../../design/brand/emblems-set-b.png");  // black on white: dark = ink
const EMBLEMS = [
  ["celestial-college", setA, { left: 100, top: 110, width: 330, height: 530 }, false],
  ["arcane-university", setA, { left: 480, top: 140, width: 450, height: 480 }, false],
  ["rift-watchers", setA, { left: 975, top: 185, width: 340, height: 430 }, false],
  ["transport-guild", setB, { left: 85, top: 190, width: 330, height: 390 }, true],
  ["hollow-hand", setB, { left: 425, top: 190, width: 250, height: 390 }, true],
  ["aquias", setB, { left: 715, top: 190, width: 330, height: 390 }, true],
  ["eternal-flame", setB, { left: 1045, top: 190, width: 300, height: 390 }, true],
];
for (const [name, src, box, dark] of EMBLEMS) {
  let ink = sharp(src).extract(box).flatten({ background: dark ? "#ffffff" : "#000000" }).greyscale();
  ink = dark ? ink.negate() : ink.linear(2, -120); // set A: lift the gold, drop the navy texture
  // sharp resizes before it negates, so set B pads with white (it turns clear after the negate).
  const alpha = await ink.resize(160, 160, { fit: "contain", background: dark ? "#ffffff" : "#000000" }).toColourspace("b-w").raw().toBuffer();
  await sharp({ create: { width: 160, height: 160, channels: 3, background: "#ffffff" } })
    .joinChannel(alpha, { raw: { width: 160, height: 160, channels: 1 } })
    .png({ compressionLevel: 9 }).toFile(at(`../public/brand/emblem-${name}.png`));
}
console.log("emblems written");
