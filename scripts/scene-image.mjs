// Scene image for a turn post (plans/table-live.md step 8): node scripts/scene-image.mjs <in> <out.webp>
// Turns upright from EXIF, fits inside 1280 x 1280, writes WebP. sharp drops all metadata (EXIF, GPS) by default,
// so nothing about the device or place it was made on is published. Prints "<width> <height>".
import sharp from "sharp";

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error("usage: node scripts/scene-image.mjs <in> <out.webp>");
  process.exit(2);
}
const info = await sharp(src)
  .rotate()
  .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
  .webp({ quality: 78 })
  .toFile(out);
console.log(`${info.width} ${info.height}`);
