/* Service worker: precache ya programu nzima, stale-while-revalidate. Badilisha VERSION kila unapobadilisha faili. */
const VERSION = "v2";
const CACHE = "duka-mahiri-" + VERSION;
const ASSETS = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/util.js", "js/bi.js", "js/demo.js", "js/db.js", "js/charts.js", "js/ui.js",
  "js/views-main.js", "js/views-more.js", "js/views-report.js", "js/views-hesabu.js", "js/app.js",
  "fonts/inter-latin-wght-normal.woff2",
  "icons/favicon.svg", "icons/favicon-32.png", "icons/apple-touch-icon.png",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("duka-mahiri-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const r = await net;
    if (r) return r;
    if (req.mode === "navigate") return (await c.match("index.html")) || Response.error();
    return Response.error();
  }));
});
