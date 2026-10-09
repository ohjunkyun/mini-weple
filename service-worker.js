// 앱 파일을 바꾸면 버전을 올려야 휴대폰에 새 캐시가 설치됩니다
const CACHE_NAME = "mini-weple-v1";

// 설치할 때 미리 저장해 둘 앱 파일 (모두 상대 경로)
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// 예전 버전 캐시 정리
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 캐시에 있으면 바로 보여주고, 온라인이면 뒤에서 최신 파일로 캐시를 갱신
// (글꼴 같은 외부 파일도 처음 온라인으로 열 때 저장되어 이후 오프라인에서 사용)
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });

      const network = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(network);
        return cached;
      }

      const res = await network;
      if (res) return res;

      // 오프라인인데 캐시에도 없는 페이지 요청이면 첫 화면으로
      if (req.mode === "navigate") return cache.match("./index.html");
      return Response.error();
    })
  );
});
