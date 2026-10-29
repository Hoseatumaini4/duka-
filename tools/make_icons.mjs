// Matumizi: node tools/make_icons.mjs  (inahitaji playwright)
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");
mkdirSync(out, { recursive: true });
function svg({ rounded = true, scale = 1 } = {}) {
  const r = rounded ? 112 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a9a63"/><stop offset="1" stop-color="#145a37"/></linearGradient></defs>
<rect width="512" height="512" rx="${r}" fill="url(#bg)"/>
<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
  <path d="M120 200h272l-22 46c-8 16-24 26-42 26-16 0-30-8-38-20-8 12-22 20-38 20s-30-8-38-20c-8 12-22 20-38 20-18 0-34-10-42-26z" fill="#fff"/>
  <path d="M132 160l16-40h216l16 40z" fill="#f5b83d"/>
  <path d="M148 280v112h216V280" fill="none" stroke="#fff" stroke-width="22" stroke-linejoin="round"/>
  <rect x="226" y="316" width="60" height="76" rx="6" fill="#f5b83d"/>
</g></svg>`;
}
const browser = await chromium.launch();
const page = await browser.newPage();
async function png(name, size, opts) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${svg(opts).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body>`);
  writeFileSync(join(out, name), await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }));
}
writeFileSync(join(out, "favicon.svg"), svg());
await png("favicon-32.png", 32); await png("apple-touch-icon.png", 180, { rounded: false });
await png("icon-192.png", 192); await png("icon-512.png", 512);
await png("icon-maskable-512.png", 512, { rounded: false, scale: 0.72 });
await browser.close();
