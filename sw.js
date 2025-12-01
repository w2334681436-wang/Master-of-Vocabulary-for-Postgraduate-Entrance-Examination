// sw.js
// ⚠️ 这是最后一次手动改版本号，改为 v8，以后改 HTML 就不用动这里了！
const CACHE_NAME = 'kaoyan-offline-v8'; 

// 静态资源列表 (这些库几年都不变，我们要死死锁在缓存里)
const LIB_URLS = [
    'https://cdn.tailwindcss.com',
    'https://cdn.staticfile.net/react/18.2.0/umd/react.production.min.js',
    'https://cdn.staticfile.net/react-dom/18.2.0/umd/react-dom.production.min.js',
    'https://cdn.staticfile.net/babel-standalone/7.23.5/babel.min.js',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    'https://cdn.staticfile.net/lz-string/1.4.4/lz-string.min.js',
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4da.png',
    './manifest.json' // 配置通常不常改，缓存优先
];

// 1. 安装：只预缓存那些“万年不变”的第三方库
self.addEventListener('install', event => {
    self.skipWaiting();
    console.log('🔥 SW: 正在安装基础库...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            // 我们不再强制缓存 index.html，让它在访问时自动缓存
            for (const url of LIB_URLS) {
                try {
                    const req = new Request(url, { mode: 'cors' });
                    const res = await fetch(req);
                    if (res.ok) await cache.put(req, res);
                } catch (e) { console.warn('库下载失败:', url); }
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

// 3. 拦截请求：智能双策略 (关键修改在这里！！！)
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // 👉 策略 A：如果是 HTML 页面 (或者根路径 /)，使用【网络优先】
    // 这样你每次部署新代码，只要用户有网，就能立刻看到最新版！
    if (event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/') {
        event.respondWith(
            fetch(event.request)
                .then(networkRes => {
                    // 1. 网络请求成功，更新缓存，并返回最新内容
                    const clone = networkRes.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return networkRes;
                })
                .catch(() => {
                    // 2. 网络请求失败 (断网了)，才去读缓存
                    return caches.match(event.request);
                })
        );
        return;
    }

    // 👉 策略 B：如果是其他资源 (CDN库, 图片)，使用【缓存优先】
    // 保证加载速度，节省流量
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(res => {
                if (res && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                }
                return res;
            });
        })
    );
});
