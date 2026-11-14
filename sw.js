// 電波がなくても開けるように、ページ一式をタブレットに保存しておく。
// ネットにつながる時は新しい版を取りに行き（3秒で諦める）、つながらない時は保存した版を出す。
const CACHE = 'marche-regi-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(networkThenCache(req));
});

async function networkThenCache(req) {
  const cache = await caches.open(CACHE);
  const net = fetch(req.url, { cache: 'no-cache' }).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  net.catch(() => {});
  const timeout = new Promise(resolve => setTimeout(resolve, 3000, null));
  try {
    const res = await Promise.race([net, timeout]);
    if (res) return res;
  } catch (err) { /* 電波なし */ }
  const hit = await cache.match(req, { ignoreSearch: true })
    || (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
  return hit || net;
}
