const CACHE_NAME = 'kaoyan-offline-v6'; // 每次发布新版改一下这个数字，强迫手机更新

// 这里列出了你 HTML 中用到的所有核心 CDN
const URLS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdn.staticfile.net/react/18.2.0/umd/react.production.min.js',
    'https://cdn.staticfile.net/react-dom/18.2.0/umd/react-dom.production.min.js',
    'https://cdn.staticfile.net/babel-standalone/7.23.5/babel.min.js',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    'https://cdn.staticfile.net/lz-string/1.4.4/lz-string.min.js',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4da.png'
];

// 1. 安装：强力下载所有资源
self.addEventListener('install', event => {
    self.skipWaiting();
    console.log('🔥 SW: 开始下载离线资源...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            for (const url of URLS_TO_CACHE) {
                try {
                    // mode: 'cors' 允许跨域请求 CDN
                    const req = new Request(url, { mode: 'cors' });
                    const res = await fetch(req);
                    if (res.ok) await cache.put(req, res);
                } catch (e) {
                    console.warn('资源下载失败:', url);
                }
            }
        })
    );
});

// 2. 激活：清理旧版本
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        )).then(() => self.clients.claim())
    );
});

// 3. 拦截：断网时返回缓存
self.addEventListener('fetch', event => {
    // 不拦截 POST 请求 (比如 AI 对话)
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request).then(cached => {
            // 如果缓存里有，直接返回缓存 (断网能用的关键)
            if (cached) return cached;
            
            // 没缓存就去网络取，并存一份
            return fetch(event.request).then(res => {
                if (res && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                }
                return res;
            }).catch(() => {
                // 断网且没缓存，这里可以不做处理，或者返回一个错误页
            });
        })
    );
});
