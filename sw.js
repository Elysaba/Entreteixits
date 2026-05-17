// SERVICE WORKER — EntreTeixits

/* Indicacions a tenir en compte: Llista d'assets estàtics que es guarden en cache durant la instal·lació.
 * Aquests fitxers estaran disponibles fins i tot sense connexió.
 * Si afegeixes nous fitxers CSS, JS o imatges, afegeix-los aquí.
 */

const CACHE_NOM = 'entreteixits-v1';


const ASSETS_CACHE = [
  // Pàgina d'error sense connexió (imprescindible)
  '/public/offline.html',

  // Estils
  '/assets/css/style.css',

  // Imatge principal i logos
  '/assets/img/hero-gent-gran.png',
  '/assets/img/logo-entreteixits.svg',
  '/assets/img/logo-entreteixits-reverse.svg',
  '/assets/img/logo-mark.svg',

  // Icones de la interfície
  '/assets/img/arrow-left.svg',
  '/assets/img/arrow-right.svg',
  '/assets/img/bell.svg',
  '/assets/img/briefcase.svg',
  '/assets/img/calendar.svg',
  '/assets/img/car.svg',
  '/assets/img/check.svg',
  '/assets/img/chevron-down.svg',
  '/assets/img/chevron-right.svg',
  '/assets/img/file-text.svg',
  '/assets/img/heart-fill.svg',
  '/assets/img/heart.svg',
  '/assets/img/home.svg',
  '/assets/img/log-out.svg',
  '/assets/img/mail.svg',
  '/assets/img/map-pin.svg',
  '/assets/img/menu.svg',
  '/assets/img/phone.svg',
  '/assets/img/plus.svg',
  '/assets/img/search.svg',
  '/assets/img/settings.svg',
  '/assets/img/shield-check.svg',
  '/assets/img/sparkles.svg',
  '/assets/img/star-fill.svg',
  '/assets/img/star.svg',
  '/assets/img/user.svg',
  '/assets/img/users.svg',
  '/assets/img/x.svg',

  // Scripts JS (no en cache els .php, ja que necessiten xarxa i sessió)
  '/scripts/js/estat-usuari.js',
  '/scripts/js/validacio-login.js',
  '/scripts/js/validacio-registre.js',
  '/scripts/js/serveis.js',
  '/scripts/js/resultats-serveis.js',
  '/scripts/js/fitxa-servei.js',
  '/scripts/js/ajudes-recursos.js',
  '/scripts/js/contactar.js',
  '/scripts/js/contactes.js',
  '/scripts/js/perfil-usuari.js'
];


// INSTAL·LACIÓ :  S'executa una sola vegada quan el SW es registra per primer cop.

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NOM)
      .then(cache => cache.addAll(ASSETS_CACHE))
      .then(() => self.skipWaiting())
  );
});


// ACTIVACIÓ : S'executa quan el SW nou és actiu.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(claus => Promise.all(
        claus
          .filter(clau => clau !== CACHE_NOM) // només elimina les que NO són la versió actual
          .map(clau => caches.delete(clau))
      ))
      // clients.claim: controla les pestanyes ja obertes sense que l'usuari recarregui
      .then(() => self.clients.claim())
  );
});

// FETCH : Regles que faig servir
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // APIs externes (Google Places, Nominatim): Sempre xarxa. 
  if (url.hostname !== self.location.hostname) {
    return;
  }

  // PHP : Sempre xarxa. Sessió activa i dades en temps real.
  if (url.pathname.endsWith('.php')) {
    return;
  }

  // Assets
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/scripts/js/')
  ) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached; // trobat a la cache, retorna immediatament

          // No estava en cache: va a la xarxa i el desa per la propera vegada
          return fetch(event.request).then(response => {
            const copia = response.clone(); // clone perquè el body només es pot llegir una vegada
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
        .catch(() => caches.match('/public/offline.html'))
    );
    return;
  }
});
