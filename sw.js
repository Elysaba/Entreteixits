// SERVICE WORKER — EntreTeixits

const CACHE_NOM = 'entreteixits-v2';

const ASSETS_CACHE = [
  // Pàgina d'error sense connexió (imprescindible)
  '/UOC/Entreteixits/public/offline.html',

  // Estils
  '/UOC/Entreteixits/assets/css/style.css',

  // Imatge principal i logos
  '/UOC/Entreteixits/assets/img/hero-gent-gran.png',
  '/UOC/Entreteixits/assets/img/logo-entreteixits.svg',
  '/UOC/Entreteixits/assets/img/logo-entreteixits-reverse.svg',
  '/UOC/Entreteixits/assets/img/logo-mark.svg',

  // Icones de la interfície
  '/UOC/Entreteixits/assets/img/arrow-left.svg',
  '/UOC/Entreteixits/assets/img/arrow-right.svg',
  '/UOC/Entreteixits/assets/img/bell.svg',
  '/UOC/Entreteixits/assets/img/briefcase.svg',
  '/UOC/Entreteixits/assets/img/calendar.svg',
  '/UOC/Entreteixits/assets/img/car.svg',
  '/UOC/Entreteixits/assets/img/check.svg',
  '/UOC/Entreteixits/assets/img/chevron-down.svg',
  '/UOC/Entreteixits/assets/img/chevron-right.svg',
  '/UOC/Entreteixits/assets/img/file-text.svg',
  '/UOC/Entreteixits/assets/img/heart-fill.svg',
  '/UOC/Entreteixits/assets/img/heart.svg',
  '/UOC/Entreteixits/assets/img/home.svg',
  '/UOC/Entreteixits/assets/img/log-out.svg',
  '/UOC/Entreteixits/assets/img/mail.svg',
  '/UOC/Entreteixits/assets/img/map-pin.svg',
  '/UOC/Entreteixits/assets/img/menu.svg',
  '/UOC/Entreteixits/assets/img/phone.svg',
  '/UOC/Entreteixits/assets/img/plus.svg',
  '/UOC/Entreteixits/assets/img/search.svg',
  '/UOC/Entreteixits/assets/img/settings.svg',
  '/UOC/Entreteixits/assets/img/shield-check.svg',
  '/UOC/Entreteixits/assets/img/sparkles.svg',
  '/UOC/Entreteixits/assets/img/star-fill.svg',
  '/UOC/Entreteixits/assets/img/star.svg',
  '/UOC/Entreteixits/assets/img/user.svg',
  '/UOC/Entreteixits/assets/img/users.svg',
  '/UOC/Entreteixits/assets/img/x.svg',

  // Scripts JS (no en cache els .php, ja que necessiten xarxa i sessió)
  '/UOC/Entreteixits/scripts/js/estat-usuari.js',
  '/UOC/Entreteixits/scripts/js/validacio-login.js',
  '/UOC/Entreteixits/scripts/js/validacio-registre.js',
  '/UOC/Entreteixits/scripts/js/serveis.js',
  '/UOC/Entreteixits/scripts/js/resultats-serveis.js',
  '/UOC/Entreteixits/scripts/js/fitxa-servei.js',
  '/UOC/Entreteixits/scripts/js/ajudes-recursos.js',
  '/UOC/Entreteixits/scripts/js/contactar.js',
  '/UOC/Entreteixits/scripts/js/contactes.js',
  '/UOC/Entreteixits/scripts/js/perfil-usuari.js'
];


// INSTAL·LACIÓ: S'executa una sola vegada quan el SW es registra per primer cop.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NOM)
      .then(cache => cache.addAll(ASSETS_CACHE))
      .then(() => self.skipWaiting())
  );
});


// ACTIVACIÓ: S'executa quan el SW nou és actiu.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(claus => Promise.all(
        claus
          .filter(clau => clau !== CACHE_NOM)
          .map(clau => caches.delete(clau))
      ))
      .then(() => self.clients.claim())
  );
});


// FETCH: Regles que faig servir
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // APIs externes (Google Places, Nominatim): Sempre xarxa.
  if (url.hostname !== self.location.hostname) {
    return;
  }

  // PHP: Sempre xarxa. Sessió activa i dades en temps real.
  if (url.pathname.endsWith('.php')) {
    return;
  }

  // Assets
  if (
    url.pathname.startsWith('/UOC/Entreteixits/assets/') ||
    url.pathname.startsWith('/UOC/Entreteixits/scripts/js/')
  ) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;

          return fetch(event.request).then(response => {
            const copia = response.clone();
            caches.open(CACHE_NOM).then(cache => cache.put(event.request, copia));
            return response;
          });
        })
    );
    return;
  }

  // HTML: Xarxa primer, i si falla (sense connexió), mostra offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/UOC/Entreteixits/public/offline.html'))
    );
    return;
  }
});
