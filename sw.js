// 这是一个极简的 Service Worker，用于满足 PWA 安装标准
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // 这里什么都不做，只是为了满足 PWA 的“离线能力”检查标准
  // 这样浏览器就会认为这是一个可安装的 App
});
