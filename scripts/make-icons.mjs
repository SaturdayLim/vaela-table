// One-off: render the PWA icons from public/icon.svg (the placeholder Vaela book-with-V mark).
import sharp from "sharp";
import { fileURLToPath } from "node:url";
const at = (p) => fileURLToPath(new URL(p, import.meta.url));
for (const [size, name] of [[192, "icon-192.png"], [512, "icon-512.png"], [180, "apple-touch-icon.png"]]) {
  await sharp(at("../public/icon.svg"), { density: 384 }).resize(size, size).png().toFile(at(`../public/${name}`));
  console.log("wrote", name);
}
