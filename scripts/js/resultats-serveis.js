/**
 * resultats-serveis.js — Pàgina de resultats (resultats-serveis.html)
 *
 * Rep per URL: ?cp=08001&radi=10&categoria=llar&sub=neteja
 * Geocodifica el CP, crida l'API i mostra les targetes.
 */

// Clau d'accés a la Google Places API (New)
const GOOGLE_API_KEY = 'AIzaSyDQbx5oBV3j2ZWHksF2YZEhkwxk8uugMsM';


// ---------------------------------------------------------------------------
// DADES ESTÀTIQUES: Configuració de categories i estratègies de cerca
// ---------------------------------------------------------------------------

// Categories que usen la Google Places Nearby Search (cerca per tipus de lloc)
const CATEGORIES_NEARBY = {
  llar:       ['electrician', 'plumber', 'locksmith', 'painter'],
  activitats: ['community_center', 'cultural_center', 'museum', 'library']
};

// Categories que usen la Google Places Text Search (cerca per text lliure)
const CATEGORIES_TEXT = {
  desplacaments: 'transporte adaptado taxi accesible discapacidad'
};

// Categories que no usen Google Places sinó la nostra pròpia BBDD
const CATEGORIES_BBDD = ['gestions', 'acompanyament'];

// Noms llegibles per a l'usuari de cada slug de categoria
const NOMS_CATEGORIA = {
  llar:          'Llar',
  activitats:    'Activitats',
  desplacaments: 'Desplaçaments',
  gestions:      'Gestions',
  acompanyament: 'Acompanyament'
};

// Configuració de cerca per a cada combinació categoria + subcategoria
// tipus 'nearby': cerca llocs de certs tipus de Google Places
// tipus 'text': cerca per paraules clau (més flexible per a serveis difícils de trobar per tipus)
const CERCA_SUBCATEGORIA = {
  llar: {
    tots:       { tipus: 'nearby', types: ['electrician', 'plumber', 'locksmith', 'painter'] },
    bricolatge: { tipus: 'nearby', types: ['electrician', 'plumber', 'locksmith', 'painter'] },
    neteja:     { tipus: 'text', query: 'limpieza hogar domicilio' },
    menjar:     { tipus: 'text', query: 'comida domicilio ancianos' }
  },
  desplacaments: {
    tots:      { tipus: 'text', query: 'transporte adaptado taxi accesible discapacidad' },
    transport: { tipus: 'text', query: 'transporte adaptado discapacidad' },
    taxi:      { tipus: 'text', query: 'taxi' }
  },
  activitats: {
    tots:       { tipus: 'nearby', types: ['community_center', 'cultural_center', 'museum', 'library'] },
    tallers:    { tipus: 'nearby', types: ['community_center', 'cultural_center'] },
    excursions: { tipus: 'text', query: 'excursiones mayores actividades' },
    viatges:    { tipus: 'text', query: 'viajes mayores organizados' }
  }
};

// Camps que demanem a l'API de Google Places per reduir el cost de la crida
// (Google cobra per camp; sol·licitar només el necessari optimitza el cost)
const GOOGLE_FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.rating', 'places.userRatingCount', 'places.location',
  'places.nationalPhoneNumber', 'places.websiteUri', 'places.photos',
  'places.editorialSummary'
].join(',');

// Icones SVG inline per no dependre de cap llibreria externa
const SVG_PIN    = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`;
const SVG_SHIELD = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L3 7v5c0 5.25 3.9 10.15 9 11.35C17.1 22.15 21 17.25 21 12V7L12 2z"/><polyline points="9 12 11 14 15 10"/></svg>`;
const SVG_HEART  = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

// Coordenades del CP de cerca, disponibles globalment per calcular distàncies
let localitzacioActual = null;


// =============================================================================
// UTILITATS
// =============================================================================

// Escapa caràcters HTML perillosos per evitar XSS en contingut dinàmic
function escapeHtml(text) {
  const el = document.createElement('div');
  el.textContent = text ?? '';
  return el.innerHTML;
}

// Retorna la primera lletra en majúscula d'un nom, per usar com a avatar de text
// quan el servei no té foto disponible
function obtenirInicial(nom) {
  const lletra = (nom || '').trim().charAt(0);
  return lletra ? lletra.toUpperCase() : '?';
}

// Fórmula de Haversine: calcula la distància real (en metres) entre dos punts
// geogràfics tenint en compte la curvatura de la Terra
function distanciaMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radi de la Terra en metres
  const toRad = (g) => (g * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Formata una distància en metres a un text llegible:
// < 1000 m → "a 350 m" | >= 1000 m → "a 1,2 km"
function formatDistancia(metres) {
  if (metres < 1000) return `a ${Math.round(metres)} m`;
  const km = metres / 1000;
  return `a ${km.toLocaleString('ca-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

// Filtra la llista de llocs retornats per l'API per descartar els que estan
// fora del radi de cerca. Si el lloc no té coordenades s'inclou per defecte.
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

// Analitza un string de preu (p.ex. "15 €/hora" o "Gratuït")
// i el descompon en {amount, unit} o {text} per renderitzar-lo estructuradament
function parsejarPreu(preu) {
  if (!preu) return null;
  const net = String(preu).trim();
  // Cerca un número (amb decimals) seguit opcionalment d'€ i unitat
  const m = net.match(/(\d+(?:[.,]\d+)?)\s*€?\s*(?:\/?\s*(.+))?/);
  if (!m) return { text: net };
  return { amount: m[1].replace(',', '.'), unit: m[2] ? `/ ${m[2].trim()}` : '' };
}

// Genera el bloc HTML del preu per inserir a la targeta
// Si no hi ha preu retorna string buit (no es mostra res)
function blocPreu(preu) {
  const parsed = parsejarPreu(preu);
  if (!parsed) return '';
  if (parsed.text) return `<div class="card-price"><span class="price-unit">${escapeHtml(parsed.text)}</span></div>`;
  const amountDisplay = parsed.amount.replace('.', ',');
  return `
    <div class="card-price">
      <div class="price-main">
        <span class="price-amount">${escapeHtml(amountDisplay)}</span><span class="price-currency">€</span>
      </div>
      ${parsed.unit ? `<span class="price-unit">${escapeHtml(parsed.unit)}</span>` : ''}
    </div>`;
}

// Genera el bloc HTML de la valoració amb estrella
// Si no hi ha rating retorna string buit
function blocValoracio(rating, numValoracions) {
  if (rating == null || rating === '') return '';
  const nota = Number(rating).toLocaleString('ca-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const text = numValoracions ? `${nota} · ${numValoracions} valoracions` : nota;
  return `<span class="card-rating"><span class="rating-star" aria-hidden="true">★</span><span>${escapeHtml(text)}</span></span>`;
}

// Mostra o amaga l'indicador de càrrega (spinner)
function mostrarLoading(visible) {
  document.getElementById('serveis-loading').style.display = visible ? 'block' : 'none';
}

// Substitueix el contingut del contenidor de targetes per un missatge d'error
function mostrarError(missatge) {
  document.getElementById('serveis-container').innerHTML =
    `<p class="missatge-buit">${escapeHtml(missatge)}</p>`;
}


// =============================================================================
// TARGETES
// =============================================================================

// Construeix els URLs de la fitxa i del formulari de contacte
// passant-hi tots els paràmetres del servei per identificar-lo a les pàgines destí
function urlsServei(params) {
  const qs = new URLSearchParams(params).toString();
  return { fitxa: `fitxa-servei.html?${qs}`, contactar: `contactar.html?${qs}` };
}

// Crea i retorna un element <article> amb tota la informació d'un servei
// S'usa tant per a resultats de Google com de BBDD pròpia
function crearTargetaServei(dades) {
  const {
    nom, categoria, categoriaSlug, descripcio, adreca, distancia,
    rating, numValoracions, preu, fotoUrl, urlFitxa, urlContactar, verificada = true
  } = dades;

  // La classe del thumbnail varia per categoria per aplicar colors CSS específics
  const thumbClass = `thumb-${categoriaSlug || 'llar'}`;

  // Si hi ha foto de Google Places es mostra la imatge; si no, es mostra la inicial del nom
  const thumbContingut = fotoUrl
    ? `<img class="card-foto" src="${escapeHtml(fotoUrl)}" alt="${escapeHtml(nom)}" loading="lazy">`
    : `<span class="card-initial">${escapeHtml(obtenirInicial(nom))}</span>`;

  // Construïm el bloc d'ubicació combinant adreça i distància si existeixen
  const ubicacioParts = [];
  if (adreca) ubicacioParts.push(escapeHtml(adreca));
  if (distancia) ubicacioParts.push(`<strong>${escapeHtml(distancia)}</strong>`);
  const ubicacioHtml = ubicacioParts.length
    ? `<p class="card-location">${SVG_PIN}${ubicacioParts.join(' · ')}</p>` : '';

  const descHtml = descripcio ? `<p class="card-desc">${escapeHtml(descripcio)}</p>` : '';
  const verificadaHtml = verificada ? `<span class="card-verified">${SVG_SHIELD}Verificada</span>` : '';

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
      ${blocPreu(preu)}
      <a href="${escapeHtml(urlFitxa)}" class="btn-outline">Veure detall</a>
      <a href="${escapeHtml(urlContactar)}" class="btn-solid">Contactar</a>
    </div>
  `;

  // El botó de favorit actua com a toggle visual (no persisteix dades en aquesta versió)
  card.querySelector('.btn-fav')?.addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('actiu');
  });

  return card;
}


// =============================================================================
// CRIDES A LES APIs
// =============================================================================

// Converteix un codi postal espanyol en coordenades {lat, lng} via Nominatim
async function geocodarCP(cp) {
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=es&format=json&limit=1`;
  const r = await fetch(url, { headers: { 'Accept-Language': 'ca' } });
  const dades = await r.json();
  if (!dades.length) throw new Error('Codi postal no trobat');
  return { lat: parseFloat(dades[0].lat), lng: parseFloat(dades[0].lon) };
}

// Google Places Nearby Search (POST):
// Cerca llocs per tipus (p.ex. 'electrician') dins d'un cercle de radi fixat
async function cercarNearby(loc, types, radiMetres) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': GOOGLE_FIELD_MASK  // Camps limitats per reduir cost API
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 10,
      locationRestriction: {
        // El radi aquí és estricte: l'API ja filtra per distància
        circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: radiMetres }
      }
    })
  });
  if (!r.ok) throw new Error(`Error Nearby API: ${r.status}`);
  return (await r.json()).places;
}

// Google Places Text Search (POST):
// Cerca llocs per query de text lliure (útil per a serveis sense tipus predefinit a Google)
// Usa locationBias (no locationRestriction) perquè és menys restrictiu i retorna més resultats
async function cercarText(loc, textQuery, radiMetres) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': GOOGLE_FIELD_MASK
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'ca',
      maxResultCount: 10,
      locationBias: {
        // Bias (no restriction): prefereix llocs dins el cercle però pot retornar de fora
        circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: radiMetres }
      }
    })
  });
  if (!r.ok) throw new Error(`Error Text API: ${r.status}`);
  return (await r.json()).places;
}

// Consulta la nostra BBDD interna via PHP per a categories que no usen Google Places
// (gestions i acompanyament: serveis oferts per l'organització, no per tercers)
async function cercarBBDD(categoria) {
  const r = await fetch(`../scripts/php/get-serveis.php?categoria=${categoria}`);
  if (!r.ok) throw new Error(`Error BBDD: ${r.status}`);
  return await r.json();
}


// =============================================================================
// RENDERITZAR RESULTATS
// =============================================================================

// Renderitza les targetes amb els llocs retornats per Google Places
// Aplica el filtre de radi secondary (Nearby ja filtra, però Text Search no)
function renderitzarServeisGoogle(llocs, categoriaSlug, radiMetres) {
  const contenidor = document.getElementById('serveis-container');
  contenidor.innerHTML = '';

  if (!llocs || llocs.length === 0) {
    contenidor.innerHTML = '<p class="missatge-buit">No s\'han trobat serveis per aquesta categoria i codi postal.</p>';
    return;
  }

  const categoriaNom = NOMS_CATEGORIA[categoriaSlug] || '';
  // Filtrem per radi: necessari sobretot per a Text Search, que usa locationBias
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

    // La foto es construeix com a URL de media de l'API; si no n'hi ha es mostrarà la inicial
    const fotoNom = lloc.photos?.[0]?.name || '';
    const fotoUrl = fotoNom
      ? `https://places.googleapis.com/v1/${fotoNom}/media?maxWidthPx=400&key=${GOOGLE_API_KEY}`
      : null;

    // Calculem la distància des del CP cercat fins al lloc
    let distancia = '';
    if (localitzacioActual && lloc.location?.latitude != null) {
      const metres = distanciaMetres(
        localitzacioActual.lat, localitzacioActual.lng,
        lloc.location.latitude, lloc.location.longitude
      );
      distancia = formatDistancia(metres);
    }

    // Passem font='google' per identificar l'origen a fitxa-servei.html i contactar.html
    const params = { font: 'google', id, nom, cat: categoriaSlug || '', adreca, foto: fotoNom, desc: descripcio };
    const urls = urlsServei(params);

    contenidor.appendChild(crearTargetaServei({
      nom, categoria: categoriaNom, categoriaSlug, descripcio,
      adreca, distancia, rating, numValoracions, fotoUrl,
      urlFitxa: urls.fitxa, urlContactar: urls.contactar, verificada: true
    }));
  });
}

// Renderitza les targetes amb els serveis de la BBDD pròpia
// Els serveis de BBDD no tenen coordenades ni rating de Google
function renderitzarServeisBBDD(serveis, categoriaSlug) {
  const contenidor = document.getElementById('serveis-container');
  contenidor.innerHTML = '';

  if (!serveis || serveis.length === 0) {
    contenidor.innerHTML = '<p class="missatge-buit">No hi ha serveis disponibles en aquesta categoria.</p>';
    return;
  }

  const categoriaNom = NOMS_CATEGORIA[categoriaSlug] || '';
  serveis.forEach(s => {
    // Passem font='bbdd' per identificar l'origen a les pàgines de detall i contacte
    const params = { font: 'bbdd', id: s.id, cat: categoriaSlug || '' };
    const urls = urlsServei(params);
    contenidor.appendChild(crearTargetaServei({
      nom: s.nom, categoria: categoriaNom, categoriaSlug,
      descripcio: s.descripcio || '', preu: s.preu || '',
      urlFitxa: urls.fitxa, urlContactar: urls.contactar, verificada: true
    }));
  });
}


// =============================================================================
// INICIALITZACIÓ
// =============================================================================

// Punt d'entrada principal. S'executa un cop el DOM està llest.
// Flux:
//   1. Llegir paràmetres de cerca de la URL
//   2. Actualitzar el botó de tornada i la info de cerca activa
//   3. Geocodificar el CP (excepte per categories de BBDD que no necessiten coordenades)
//   4. Decidir estratègia de cerca (BBDD / Nearby / Text) i executar la crida
//   5. Renderitzar les targetes resultants
async function init() {
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

  // Mostra la info de cerca activa (CP · km · categoria · subcategoria)
  const infoEl = document.getElementById('resultats-info-cerca');
  if (infoEl && cp && categoria) {
    const nomCat = NOMS_CATEGORIA[categoria] || categoria;
    const nomSub = sub && sub !== 'tots' ? ` · ${sub}` : '';
    infoEl.innerHTML = `<strong>${escapeHtml(cp)}</strong> · ${radiKm} km · ${escapeHtml(nomCat)}${escapeHtml(nomSub)}`;
  }

  // Títol de la secció (p.ex. "Serveis de Llar")
  const titolEl = document.getElementById('categoria-titol');
  if (titolEl && categoria) {
    titolEl.textContent = NOMS_CATEGORIA[categoria]
      ? `Serveis de ${NOMS_CATEGORIA[categoria]}`
      : 'Resultats';
  }

  // Guardem la pàgina si no hi ha paràmetres mínims (CP és obligatori per a Google Places)
  if (!cp && !CATEGORIES_BBDD.includes(categoria)) {
    document.getElementById('serveis-container').innerHTML =
      '<p class="missatge-buit">No s\'han especificat paràmetres de cerca.</p>';
    return;
  }

  mostrarLoading(true);

  try {
    // Geocodifiquem el CP per obtenir coordenades (no cal per BBDD)
    if (!CATEGORIES_BBDD.includes(categoria)) {
      localitzacioActual = await geocodarCP(cp);
    }

    if (CATEGORIES_BBDD.includes(categoria)) {
      // --- Ruta BBDD: gestions i acompanyament ---
      const serveis = await cercarBBDD(categoria);
      mostrarLoading(false);
      renderitzarServeisBBDD(serveis, categoria);
    } else {
      // --- Ruta Google Places: llar, activitats, desplacaments ---
      // Intentem trobar la configuració específica per categoria+subcategoria;
      // si no existeix, usem el fallback genèric de la categoria
      const cerca = CERCA_SUBCATEGORIA[categoria]?.[sub]
        || { tipus: 'nearby', types: CATEGORIES_NEARBY[categoria] }
        || { tipus: 'text', query: CATEGORIES_TEXT[categoria] };

      let llocs;
      if (cerca.tipus === 'nearby') {
        llocs = await cercarNearby(localitzacioActual, cerca.types, radiMetres);
      } else {
        llocs = await cercarText(localitzacioActual, cerca.query, radiMetres);
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
