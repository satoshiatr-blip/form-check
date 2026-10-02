// 電波の弱い場所でも開けるよう、アプリ本体をキャッシュする（動画は扱わない）
const CACHE = 'form-check-v2'

self.addEventListener('install', () => self.skipWaiting())
// github.io は他アプリと同じオリジンなので、自分のキャッシュだけを消す
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => /^form-check-v\d+$/.test(k) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()),
))

self.addEventListener('message', e => {
  if (e.data?.type === 'precache') e.waitUntil(caches.open(CACHE).then(c => c.addAll(e.data.urls)).catch(() => {}))
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req, { cache: 'no-store' }).then(r => {
      const copy = r.clone()
      caches.open(CACHE).then(c => c.put(req, copy))
      return r
    }).catch(() => caches.match(req).then(r => r || caches.match('./'))))
    return
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req, { cache: 'no-store' }).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
    return r
  })))
})
