/* Service worker mínimo: permite instalar o app na tela inicial.
   Rede primeiro (sempre a versão mais nova); cópia local só se estiver sem conexão.
   Só arquivos do próprio site: dados do Supabase nunca são guardados aqui. */
const CACHE = 'diario-v3'; // trocar a cada publicação força a limpeza das cópias antigas
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./'))));
});
