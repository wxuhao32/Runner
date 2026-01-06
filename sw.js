// public/sw.js
self.addEventListener("install", () => {
  // 让新 SW 尽快接管
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 让它立刻控制所有页面
  event.waitUntil(self.clients.claim());
});

// 最小可用：不做缓存，不拦截请求，避免把你的游戏资源缓存坏掉
self.addEventListener("fetch", () => {
  // do nothing
});
