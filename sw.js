/* Pourcast service worker: makes the app installable and offline-capable.
   VERSION is bumped on every release (by release.sh) so a new deploy replaces
   the old cache cleanly. Strategy:
     - HTML / navigations: network-first (new deploys show immediately; cache is the offline fallback)
     - same-origin assets (versioned via ?v=, plus images/audio): cache-first (immutable per version)
     - cross-origin (Google Fonts): stale-while-revalidate */
const VERSION='1.5.1';
const Q='?v='+VERSION;
const SHELL='pourcast-shell-'+VERSION;
const RUNTIME='pourcast-runtime-'+VERSION;
const SHELL_ASSETS=[
  './',
  './index.html',
  './app.js'+Q,
  './styles.css'+Q,
  './manifest.json',
  './pour.mp3',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32x32.png'
];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(c=>c.addAll(SHELL_ASSETS)).catch(()=>{}));
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==SHELL&&k!==RUNTIME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  // HTML / navigations: network-first so a fresh deploy always wins; fall back to cache offline
  if(req.mode==='navigate'||req.destination==='document'){
    e.respondWith(
      fetch(req).then(r=>{
        const cp=r.clone();
        caches.open(SHELL).then(c=>c.put('./index.html',cp));
        return r;
      }).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  // same-origin assets: cache-first (versioned URLs are immutable; new versions fetch fresh)
  if(url.origin===location.origin){
    e.respondWith(
      caches.match(req).then(c=>c||fetch(req).then(r=>{
        const cp=r.clone();
        caches.open(RUNTIME).then(x=>x.put(req,cp));
        return r;
      }))
    );
    return;
  }

  // cross-origin (Google Fonts, etc.): stale-while-revalidate
  e.respondWith(
    caches.match(req).then(c=>{
      const net=fetch(req).then(r=>{
        const cp=r.clone();
        caches.open(RUNTIME).then(x=>x.put(req,cp));
        return r;
      }).catch(()=>c);
      return c||net;
    })
  );
});
