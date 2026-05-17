/* Aquest script és el que ens mostrarà els resultats de la cerca dels serveis
 * Faig la crida a l'AI de Google Places, i ens mostrarà els resultats segons els paràmetres que els passem de
   la pàgina de serveis.html
 * Una de les funcionalitats és poder guardar el servei com a favorit, i en la part de l'usuari es mostri, i això de moment només ho podem fer
   amb els serveis que tenim a la nostra Base de dades. Per aquest motiu he decidit que els serveis de Google Places es guardi el LocalStorage
   per veure el funcionament d'aquesta acció
*/

// Clau d'accés a la Google Places API (New)
const GOOGLE_API_KEY = 'AIzaSyDQbx5oBV3j2ZWHksF2YZEhkwxk8uugMsM';


/*  Declarem les variables necessàries per gestionar les categories i subcategories. I també seleccionem les categories que volem que
l'API de Google Places es retorni 
*/

/* Categories de Google Places Nearby Search. Aquestes categories hem tret les que encaixen millor el nostre projecte.
 * Són serveis generals perquè Google Places no té específic a la tercera edat, però ens ajuda per veure el funcionament.
*/
const categoria_google_places = {
  llar:       ['electrician', 'plumber', 'locksmith', 'painter', 'carpenter', 'general_contractor'],
  activitats: ['community_center', 'cultural_center', 'museum']
};

// Alguns serveis no encaixen i farem cerca amb text
const categories_text = {
  desplacaments: 'transporte adaptado taxi accesible discapacidad'
}

// Categories que no usen Google Places sinó la nostra pròpia BBDD
const categories_basededades = ['gestions', 'acompanyament'];

// Noms llegibles per a l'usuari de cada slug de categoria
const noms_categoria = {
  llar:          'Llar',
  activitats:    'Activitats',
  desplacaments: 'Desplaçaments',
  gestions:      'Gestions',
  acompanyament: 'Acompanyament'
};

// Configuració de cerca per a cada combinació categoria + subcategoria

const cerca_subcategoria = {
  llar: {
    tots: {
      tipus: 'multi',
      cerques: [
        { tipus: 'text', query: 'bricolatge reparacions llar fontaner electricista pintor' },
        { tipus: 'text', query: 'neteja de la llar servei domèstic' },
        { tipus: 'text', query: 'menjar a domicili persones majors' }
      ]
    },
    bricolatge: { tipus: 'text', query: 'bricolatge reparacions llar fontaner electricista pintor' },
    neteja:     { tipus: 'text', query: 'neteja de la llar servei domèstic' },
    menjar:     { tipus: 'text', query: 'menjar a domicili persones majors' }
  },
  desplacaments: {
    tots: {
      tipus: 'multi',
      cerques: [
        { tipus: 'text', query: 'transporte adaptado discapacidad' },
        { tipus: 'text', query: 'taxi' }
      ]
    },
    transport: { tipus: 'text', query: 'transporte adaptado discapacidad' },
    taxi:      { tipus: 'text', query: 'taxi' }
  },
  activitats: {
    tots: {
      tipus: 'multi',
      cerques: [
        { tipus: 'nearby', types: ['community_center', 'cultural_center'] },
        { tipus: 'text', query: 'excursiones mayores actividades' },
        { tipus: 'text', query: 'viajes mayores organizados' }
      ]
    },
    tallers:    { tipus: 'nearby', types: ['community_center', 'cultural_center'] },
    excursions: { tipus: 'text', query: 'excursiones mayores actividades' },
    viatges:    { tipus: 'text', query: 'viajes mayores organizados' }
  }
};

// Camps que demanem a l'API de Google Places.
const google_field_mask = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.rating', 'places.userRatingCount', 'places.location',
  'places.nationalPhoneNumber', 'places.websiteUri', 'places.photos',
  'places.editorialSummary'
].join(',');

// Icones SVG per no dependre de cap llibreria externa
const SVG_PIN    = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`;
const SVG_SHIELD = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L3 7v5c0 5.25 3.9 10.15 9 11.35C17.1 22.15 21 17.25 21 12V7L12 2z"/><polyline points="9 12 11 14 15 10"/></svg>`;
const SVG_HEART  = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

// Coordenades del CP de cerca, disponibles globalment per calcular distàncies
let localitzacioActual = null;

// Favorits "id_services" i Google Places (localStorage)
let favoritIdsDB     = new Set();
let favoritIdsGoogle = new Set();

function escapeHtml(text) {
  const el = document.createElement('div');
  el.textContent = text ?? '';
  return el.innerHTML;
}

// Retorna la primera lletra en majúscula d'un nom, per usar com a avatar de text
function obtenirInicial(nom) {
  const lletra = (nom || '').trim().charAt(0);
  return lletra ? lletra.toUpperCase() : '?';
}

// Càlcul de la distància real (en metres) entre dos punts
function distanciaMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radi de la Terra en metres
  const toRad = (g) => (g * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Formata una distància en metres a un text llegible
function formatDistancia(metres) {
  if (metres < 1000) return `a ${Math.round(metres)} m`;
  const km = metres / 1000;
  return `a ${km.toLocaleString('ca-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

// Filtrem la llista de llocs retornats per l'API per descartar els que estan fora del radi de cerca. 
// Si el lloc no té coordenades s'inclou per defecte.
function filtrarLlocsPerRadi(llocs, radiMetres) {
  if (!llocs?.length || !localitzacioActual) return llocs || [];
  return llocs.filter(lloc => {
    if (lloc.location?.latitude == null) return true;
    const metres = distanciaMetres(
      localitzacioActual.lat, localitzacioActual.lng,
      lloc.location.latitude, lloc.location.longitude
    );
    return metres <= radiMetres;
  });
}

// Genera el bloc HTML de la valoració amb estrella
function blocValoracio(rating, numValoracions) {
  if (rating == null || rating === '') return '';
  const nota = Number(rating).toLocaleString('ca-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const text = numValoracions ? `${nota} · ${numValoracions} valoracions` : nota;
  return `<span class="card-rating"><span class="rating-star" aria-hidden="true">★</span><span>${escapeHtml(text)}</span></span>`;
}

// Mostra o amaga l'indicador de càrrega
function mostrarLoading(visible) {
  document.getElementById('serveis-loading').style.display = visible ? 'block' : 'none';
}

// Substitueix el contingut del contenidor de targetes per un missatge d'error
function mostrarError(missatge) {
  document.getElementById('serveis-container').innerHTML =
    `<p class="missatge-buit">${escapeHtml(missatge)}</p>`;
}

// Construeix els URLs de la fitxa i del formulari de contacte
function urlsServei(params) {
  const qs = new URLSearchParams(params).toString();
  return { fitxa: `fitxa-servei.html?${qs}`, contactar: `contactar.html?${qs}` };
}

function mostrarMissatgeFav(btn, text) {
  if (btn.parentElement.querySelector('.fav-login-msg')) return;
  const msg = document.createElement('p');
  msg.className = 'fav-login-msg';
  msg.textContent = text;
  btn.parentElement.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

// Crea i retorna un element <article> amb tota la informació d'un servei
function crearTargetaServei(dades) {
  const {
    nom, categoria, categoriaSlug, descripcio, adreca, distancia,
    rating, numValoracions, fotoUrl, urlFitxa, urlContactar,
    verificada = true, font = '', idExtern = ''
  } = dades;

  const thumbClass = `thumb-${categoriaSlug || 'llar'}`;

  const thumbContingut = fotoUrl
    ? `<img class="card-foto" src="${escapeHtml(fotoUrl)}" alt="${escapeHtml(nom)}" loading="lazy">`
    : `<span class="card-initial">${escapeHtml(obtenirInicial(nom))}</span>`;

  const ubicacioParts = [];
  if (adreca) ubicacioParts.push(escapeHtml(adreca));
  if (distancia) ubicacioParts.push(`<strong>${escapeHtml(distancia)}</strong>`);
  const ubicacioHtml = ubicacioParts.length
    ? `<p class="card-location">${SVG_PIN}${ubicacioParts.join(' · ')}</p>` : '';

  const descHtml = descripcio ? `<p class="card-desc">${escapeHtml(descripcio)}</p>` : '';
  const verificadaHtml = verificada ? `<span class="card-verified">${SVG_SHIELD}Verificada</span>` : '';

  // Configuració de les cards amb els serveis
  const card = document.createElement('article');
  card.className = 'service-card';
  card.innerHTML = `
    <div class="card-thumb ${thumbClass}">${thumbContingut}</div>
    <div class="card-info">
      <span class="card-badge">${escapeHtml(categoria)}</span>
      <h3 class="card-name">${escapeHtml(nom)}</h3>
      ${ubicacioHtml}
      ${descHtml}
      <div class="card-meta">
        ${blocValoracio(rating, numValoracions)}
        ${verificadaHtml}
      </div>
    </div>
    <div class="card-cta">
      <button class="btn-fav" type="button" aria-label="Afegir ${escapeHtml(nom)} als preferits">${SVG_HEART}</button>
      <a href="${escapeHtml(urlFitxa)}" class="btn-outline">Veure detall</a>
      <a href="${escapeHtml(urlContactar)}" class="btn-solid">Contactar</a>
    </div>
  `;

  const btnFav = card.querySelector('.btn-fav');

  // Marquem inicialment si ja és favorit
  const esFavInicial = font === 'bbdd'
    ? favoritIdsDB.has(idExtern)
    : favoritIdsGoogle.has(idExtern);
  if (esFavInicial) btnFav.classList.add('actiu');

  btnFav.addEventListener('click', async () => {
    if (font === 'google') {
      // Google Places: localStorage (requereix sessió activa)
      try {
        const sessioR = await fetch('../scripts/php/estat-usuari.php');
        const sessio  = await sessioR.json();
        if (!sessio?.logat) {
          mostrarMissatgeFav(btnFav, 'Has d\'iniciar sessió per guardar favorits.');
          return;
        }
      } catch { /* si no podem comprovar sessió, bloquejem */ return; }

      const esActiu = btnFav.classList.contains('actiu');
      const raw2 = localStorage.getItem('entreteixits_fav_google');
      let llista = raw2 ? JSON.parse(raw2) : [];
      if (esActiu) {
        favoritIdsGoogle.delete(idExtern);
        btnFav.classList.remove('actiu');
        llista = llista.filter(f => (typeof f === 'object' ? f.id : f) !== idExtern);
      } else {
        favoritIdsGoogle.add(idExtern);
        btnFav.classList.add('actiu');
        llista = llista.filter(f => typeof f === 'object'); // neteja format antic
        if (!llista.some(f => f.id === idExtern)) {
          llista.push({ id: idExtern, nom, categoria: categoriaSlug, adreca });
        }
      }
      localStorage.setItem('entreteixits_fav_google', JSON.stringify(llista));
      return;
    }

    // Faig la crida a la taula de Favorites via PHP
    try {
      const r = await fetch('../scripts/php/toggle-favorit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_services: parseInt(idExtern) })
      });
      const resposta = await r.json();
      if (resposta.ok) {
        const afegit = resposta.estat === 'afegit';
        btnFav.classList.toggle('actiu', afegit);
        if (afegit) favoritIdsDB.add(idExtern);
        else favoritIdsDB.delete(idExtern);
      } else if (resposta.error === 'no_auth') {
        mostrarMissatgeFav(btnFav, 'Has d\'iniciar sessió per guardar favorits.');
      } else {
        console.error('Error toggle favorit:', resposta.error);
        mostrarMissatgeFav(btnFav, 'No s\'ha pogut guardar el favorit. Torna-ho a intentar.');
      }
    } catch (err) {
      console.error('Error de xarxa en toggle favorit:', err);
      mostrarMissatgeFav(btnFav, 'Error de connexió. Comprova la teva xarxa.');
    }
  });

  return card;
}

// Hem de realitzar diferents crides a diferents APIS

// Crida API NOMINATIM
async function geocodarCP(cp) {
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=es&format=json&limit=1`;
  const r = await fetch(url, { headers: { 'Accept-Language': 'ca' } });
  const dades = await r.json();
  if (!dades.length) throw new Error('Codi postal no trobat');
  return { lat: parseFloat(dades[0].lat), lng: parseFloat(dades[0].lon) };
}

// Crida API Google Places
async function cercarNearby(loc, types, radiMetres) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': google_field_mask 
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 10,
      locationRestriction: {
        circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: Math.min(radiMetres, 50000) }
      }
    })
  });
  if (!r.ok) throw new Error(`Error Nearby API: ${r.status}`);
  return (await r.json()).places;
}

// Combina diverses cerques i elimina duplicats per place id
async function cercarMulti(loc, cerques, radiMetres) {
  const resultats = await Promise.all(
    cerques.map(c => executarCerca(loc, c, radiMetres))
  );
  const vistos = new Set();
  const units = [];
  for (const llista of resultats) {
    for (const lloc of llista || []) {
      const id = lloc.id || `${lloc.location?.latitude},${lloc.location?.longitude},${lloc.displayName?.text}`;
      if (vistos.has(id)) continue;
      vistos.add(id);
      units.push(lloc);
    }
  }
  return units;
}

async function executarCerca(loc, cerca, radiMetres) {
  if (cerca.tipus === 'nearby') {
    return (await cercarNearby(loc, cerca.types, radiMetres)) || [];
  }
  if (cerca.tipus === 'text') {
    return (await cercarText(loc, cerca.query, radiMetres)) || [];
  }
  return [];
}

// Cerca llocs per query de text lliure (útil per a serveis sense tipus predefinit a Google)
async function cercarText(loc, textQuery, radiMetres) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': google_field_mask
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'ca',
      maxResultCount: 10,
      locationBias: {
        circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: Math.min(radiMetres, 50000) }
      }
    })
  });
  if (!r.ok) throw new Error(`Error Text API: ${r.status}`);
  return (await r.json()).places;
}

// Consultem la nostra BBDD interna via PHP per a categories que no utilitzarem per Google Places
async function cercarBBDD(categoria) {
  const r = await fetch(`../scripts/php/get-serveis.php?categoria=${categoria}`);
  if (!r.ok) throw new Error(`Error BBDD: ${r.status}`);
  return await r.json();
}

// Carrega els favorits de l'usuari
async function carregarFavorits() {
  // via la taula de Favorites de la Base de dades
  try {
    const r = await fetch('../scripts/php/get-favorits.php');
    const llista = await r.json();
    if (Array.isArray(llista)) {
      favoritIdsDB = new Set(llista.map(f => String(f.id_services)));
    }
  } catch (err) {
    console.error('Error carregant favorits BBDD:', err);
  }
  // via localStorage (format: [{id, nom, categoria, adreca}])
  try {
    const raw = localStorage.getItem('entreteixits_fav_google');
    if (raw) {
      const llista = JSON.parse(raw);
      if (Array.isArray(llista)) {
        llista.forEach(f => favoritIdsGoogle.add(typeof f === 'object' ? f.id : f));
      }
    }
  } catch { /* localStorage no disponible */ }
}

// Renderitza les targetes. Apliquem el filtre de radi secondary
function renderitzarServeisGoogle(llocs, categoriaSlug, radiMetres) {
  const contenidor = document.getElementById('serveis-container');
  contenidor.innerHTML = '';

  if (!llocs || llocs.length === 0) {
    contenidor.innerHTML = '<p class="missatge-buit">No s\'han trobat serveis per aquesta categoria i codi postal.</p>';
    return;
  }

  const categoriaNom = noms_categoria[categoriaSlug] || '';
  const llocsDinsRadi = filtrarLlocsPerRadi(llocs, radiMetres);

  if (!llocsDinsRadi.length) {
    contenidor.innerHTML = '<p class="missatge-buit">No s\'han trobat serveis dins del radi seleccionat. Prova amb un radi més gran.</p>';
    return;
  }

  llocsDinsRadi.forEach(lloc => {
    const id = lloc.id || '';
    const nom = lloc.displayName?.text || 'Sense nom';
    const adreca = lloc.formattedAddress || '';
    const descripcio = lloc.editorialSummary?.text || '';
    const rating = lloc.rating ?? null;
    const numValoracions = lloc.userRatingCount ?? null;

    // Calculem la distància des del codi postal que s'ha posat
    let distancia = '';
    if (localitzacioActual && lloc.location?.latitude != null) {
      const metres = distanciaMetres(
        localitzacioActual.lat, localitzacioActual.lng,
        lloc.location.latitude, lloc.location.longitude
      );
      distancia = formatDistancia(metres);
    }

    const params = { font: 'google', id, nom, cat: categoriaSlug || '' };
    const urls = urlsServei(params);

    contenidor.appendChild(crearTargetaServei({
      nom, categoria: categoriaNom, categoriaSlug, descripcio,
      adreca, distancia, rating, numValoracions,
      urlFitxa: urls.fitxa, urlContactar: urls.contactar, verificada: true,
      font: 'google', idExtern: id
    }));
  });
}

// Renderitza les targetes amb els serveis de la nostra pròpia Base de Dades
function renderitzarServeisBBDD(serveis, categoriaSlug) {
  const contenidor = document.getElementById('serveis-container');
  contenidor.innerHTML = '';

  if (!serveis || serveis.length === 0) {
    contenidor.innerHTML = '<p class="missatge-buit">No hi ha serveis disponibles en aquesta categoria.</p>';
    return;
  }

  const categoriaNom = noms_categoria[categoriaSlug] || '';
  serveis.forEach(s => {
    // Passem font='bbdd' per identificar l'origen a les pàgines de detall i contacte
    const params = { font: 'bbdd', id: s.id, nom: s.nom, cat: categoriaSlug || '' };
    const urls = urlsServei(params);
    contenidor.appendChild(crearTargetaServei({
      nom: s.nom, categoria: categoriaNom, categoriaSlug,
      descripcio: s.descripcio || '',
      urlFitxa: urls.fitxa, urlContactar: urls.contactar, verificada: true,
      font: 'bbdd', idExtern: String(s.id)
    }));
  });
}

// Procès d'execució
async function init() {
  await carregarFavorits();

  const params   = new URLSearchParams(window.location.search);
  const cp       = params.get('cp') || '';
  const radiKm   = parseInt(params.get('radi') || '10', 10);
  const categoria = params.get('categoria') || '';
  const sub      = params.get('sub') || 'tots';  // Per defecte mostrem tots
  const radiMetres = radiKm * 1000;

  // Actualitza el botó de tornar amb els paràmetres de cerca per restaurar l'estat
  const backBtn = document.getElementById('btn-tornar-cerca');
  if (backBtn) {
    const backParams = new URLSearchParams({ cp, radi: radiKm, categoria });
    backBtn.href = `serveis.html?${backParams.toString()}`;
  }

  const infoEl = document.getElementById('resultats-info-cerca');
  if (infoEl && cp && categoria) {
    const nomCat = noms_categoria[categoria] || categoria;
    const nomSub = sub && sub !== 'tots' ? ` · ${sub}` : '';
    infoEl.innerHTML = `<strong>${escapeHtml(cp)}</strong> · ${radiKm} km · ${escapeHtml(nomCat)}${escapeHtml(nomSub)}`;
  }

  const titolEl = document.getElementById('categoria-titol');
  if (titolEl && categoria) {
    titolEl.textContent = noms_categoria[categoria]
      ? `Serveis de ${noms_categoria[categoria]}`
      : 'Resultats';
  }

  // Guardem la pàgina si no hi ha paràmetres mínims
  if (!cp && !categories_basededades.includes(categoria)) {
    document.getElementById('serveis-container').innerHTML =
      '<p class="missatge-buit">No s\'han especificat paràmetres de cerca.</p>';
    return;
  }

  mostrarLoading(true);

  try {
    if (!categories_basededades.includes(categoria)) {
      localitzacioActual = await geocodarCP(cp);
    }

    if (categories_basededades.includes(categoria)) {
      // --- Ruta BBDD: gestions i acompanyament ---
      const serveis = await cercarBBDD(categoria);
      mostrarLoading(false);
      renderitzarServeisBBDD(serveis, categoria);
    } else {
      // --- Ruta Google Places: llar, activitats, desplacaments ---
      const cerca = cerca_subcategoria[categoria]?.[sub]
        || { tipus: 'text', query: categories_text[categoria] };

      let llocs;
      if (cerca.tipus === 'multi') {
        llocs = await cercarMulti(localitzacioActual, cerca.cerques, radiMetres);
      } else {
        llocs = await executarCerca(localitzacioActual, cerca, radiMetres);
      }
      mostrarLoading(false);
      renderitzarServeisGoogle(llocs, categoria, radiMetres);
    }
  } catch (error) {
    mostrarLoading(false);
    mostrarError('No hem pogut carregar els serveis. Torna a la cerca i prova de nou.');
    console.error(error);
  }
}

// Esperem que el DOM estigui completament carregat abans d'inicialitzar
document.addEventListener('DOMContentLoaded', init);
