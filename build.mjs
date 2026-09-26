import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

// Preserve public URL paths when building the uploaded source files.
const files = {
  "app.js": "app.js",
  "bedroom.jpg": "assets/bedroom.jpg",
  "canvas-city.png": "assets/canvas-city.png",
  "chaos-art.jpg": "assets/chaos-art.jpg",
  "character.png": "assets/character.png",
  "crown-art.jpg": "assets/crown-art.jpg",
  "crown-pillow.jpg": "assets/crown-pillow.jpg",
  "living-room.jpg": "assets/living-room.jpg",
  "skateboard.png": "assets/skateboard.png",
  "stay-hungry.jpg": "assets/stay-hungry.jpg",
  "stickers.jpg": "assets/stickers.jpg",
  "texture.png": "assets/texture.png",
  "catalog.js": "catalog.js",
  "return.css": "checkout/return.css",
  "return.html": "checkout/return.html",
  "return.js": "checkout/return.js",
  "favicon.svg": "favicon.svg",
  "fonts.css": "fonts.css",
  "index.html": "index.html",
  "shopify.js": "shopify.js",
  "styles.css": "styles.css"
};
await rm('dist', { recursive: true, force: true });
for (const [source, target] of Object.entries(files)) {
  await mkdir(dirname('dist/' + target), { recursive: true });
  await cp(source, 'dist/' + target);
}
