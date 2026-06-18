/* Trace Service Worker — 离线壳 + 智能缓存
 * 策略：
 *  - 静态资源（icon/manifest/_next 静态产物）：Cache First（缓存优先，秒开）
 *  - 页面导航 + 其它 GET：Network First（网络优先，离线回退缓存）
 *  - /api/llm（AI 接口）：永远走网络，不缓存（结果实时且含 Key，不应落缓存）
 */
const CACHE = "trace-v1";
const CORE = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // 同源之外（如模型厂商）不接管
  if (url.origin !== self.location.origin) return;
  // AI 接口永远走网络、不缓存
  if (url.pathname.startsWith("/api/")) return;

  // 静态资源：Cache First
  const isAsset =
    url.pathname.startsWith("/_next/") ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?|json)$/.test(url.pathname);

  if (isAsset) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // 页面导航 / 其它：Network First，失败回退缓存，再回退首页
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/")))
  );
});
