const GOOGLE_API_KEY = '';

const CATEGORIES_NEARBY = {
  llar:       ['electrician', 'plumber', 'locksmith', 'painter'],
  activitats: ['community_center', 'cultural_center', 'museum', 'library']
};

const CATEGORIES_TEXT = {
  desplacaments: 'transporte adaptado taxi accesible discapacidad'
};

const CATEGORIES_BBDD = ['gestions', 'acompanyament'];

const NOMS_CATEGORIA = {
  llar:          'Llar',
  activitats:    'Activitats',
  desplacaments: 'Desplaçaments',
  gestions:      'Gestions',
  acompanyament: 'Acompanyament'
};

let localitzacioActual = null;

// ── Geocodificació CP → coordenades (Nominatim, gratuït) ──────────────────────
async function geocodarCP(cp) {
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=es&format=json&limit=1`;
  const r = await fetch(url, { headers: { 'Accept-Language': 'ca' } });
  const dades = await r.json();
  if (!dades.length) throw new Error('Codi postal no trobat');
  return { lat: parseFloat(dades[0].lat), lng: parseFloat(dades[0].lon) };
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function obtenirCategoria() {
  return new URLSearchParams(window.location.search).get('categoria') || null;
}

function marcarBotoActiu(categoria) {
  document.querySelectorAll('.categories-nav button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === categoria);
  });
}

function actualitzarTitol(categoria) {
  document.getElementById('categoria-titol').textContent = categoria
    ? `Serveis de ${NOMS_CATEGORIA[categoria]}`
    : 'Tots els serveis';
}

function mostrarLoading(visible) {
  document.getElementById('serveis-loading').style.display = visible ? 'block' : 'none';
}

function mostrarMissatge(text) {
  document.getElementById('serveis-container').innerHTML = `<p>${text}</p>`;
}

function mostrarError(missatge) {
  document.getElementById('serveis-container').innerHTML = `<p class="error">${missatge}</p>`;
}

// ── Renderitzat ───────────────────────────────────────────────────────────────
function renderitzarServeisGoogle(llocs) {
  const contenidor = document.getElementById('serveis-container');
  contenidor.innerHTML = '';

  if (!llocs || llocs.length === 0) {
    contenidor.innerHTML = '<p class="missatge-buit">No s\'han trobat serveis per aquesta categoria i codi postal.</p>';
    return;
  }

  llocs.forEach(lloc => {
    const id         = lloc.id || '';
    const nom        = lloc.displayName?.text || 'Sense nom';
    const adreca     = lloc.formattedAddress || '';
    const rating     = lloc.rating ? `⭐ ${lloc.rating}` : '';
    const telefon    = lloc.nationalPhoneNumber || '';
    const descripcio = lloc.editorialSummary?.text || '';
    const fotoNom    = lloc.photos?.[0]?.name || '';
    const fotoUrl    = fotoNom
      ? `https://places.googleapis.com/v1/${fotoNom}/media?maxWidthPx=400&key=${GOOGLE_API_KEY}`
      : null;

    const params = new URLSearchParams({
      font: 'google', id, nom, cat: obtenirCategoria() || '', adreca, foto: fotoNom, desc: descripcio
    });
    const urlFitxa     = `fitxa-servei.html?${params}`;
    const urlContactar = `contactar.html?${params}`;

    const card = document.createElement('article');
    card.className = 'service-card';
    card.innerHTML = `
      ${fotoUrl ? `<img class="card-foto" src="${fotoUrl}" alt="${nom}" loading="lazy">` : ''}
      <div class="card-cos">
        <h3>${nom}</h3>
        ${descripcio ? `<p class="card-descripcio">${descripcio}</p>` : ''}
        ${adreca     ? `<p class="adreca">${adreca}</p>` : ''}
        ${rating     ? `<p class="valoracio">${rating}</p>` : ''}
        <div class="card-actions">
          <a href="${urlFitxa}" class="btn">Veure fitxa</a>
          <a href="${urlContactar}" class="btn btn-primary">Contactar</a>
        </div>
      </div>
    `;
    contenidor.appendChild(card);
  });
}

function renderitzarServeisBBDD(serveis) {
  const contenidor = document.getElementById('serveis-container');
  contenidor.innerHTML = '';

  if (!serveis || serveis.length === 0) {
    contenidor.innerHTML = '<p class="missatge-buit">No hi ha serveis disponibles en aquesta categoria.</p>';
    return;
  }

  serveis.forEach(s => {
    const params = new URLSearchParams({
      font: 'bbdd', id: s.id, cat: obtenirCategoria() || ''
    });
    const urlFitxa     = `fitxa-servei.html?${params}`;
    const urlContactar = `contactar.html?${params}`;

    const card = document.createElement('article');
    card.className = 'service-card';
    card.innerHTML = `
      <div class="card-cos">
        <h3>${s.nom}</h3>
        ${s.descripcio ? `<p class="card-descripcio">${s.descripcio}</p>` : ''}
        ${s.preu       ? `<p class="price">${s.preu}</p>` : ''}
        <div class="card-actions">
          <a href="${urlFitxa}" class="btn">Veure fitxa</a>
          <a href="${urlContactar}" class="btn btn-primary">Contactar</a>
        </div>
      </div>
    `;
    contenidor.appendChild(card);
  });
}

// ── Crides API ────────────────────────────────────────────────────────────────
async function cercarNearby(categoria, loc) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.nationalPhoneNumber,places.websiteUri,places.photos,places.editorialSummary'
    },
    body: JSON.stringify({
      includedTypes: CATEGORIES_NEARBY[categoria],
      maxResultCount: 10,
      locationRestriction: {
        circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: 15000.0 }
      }
    })
  });
  if (!r.ok) throw new Error(`Error Nearby API: ${r.status}`);
  return (await r.json()).places;
}

async function cercarText(categoria, loc) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.nationalPhoneNumber,places.websiteUri,places.photos,places.editorialSummary'
    },
    body: JSON.stringify({
      textQuery: CATEGORIES_TEXT[categoria],
      languageCode: 'ca',
      maxResultCount: 10,
      locationBias: {
        circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: 30000.0 }
      }
    })
  });
  if (!r.ok) throw new Error(`Error Text API: ${r.status}`);
  return (await r.json()).places;
}

async function cercarBBDD(categoria) {
  const r = await fetch(`../scripts/php/get-serveis.php?categoria=${categoria}`);
  if (!r.ok) throw new Error(`Error BBDD: ${r.status}`);
  return await r.json();
}

// ── Càrrega de serveis ────────────────────────────────────────────────────────
async function carregar(categoria) {
  if (!localitzacioActual && !CATEGORIES_BBDD.includes(categoria)) {
    mostrarMissatge('Introdueix el teu codi postal per veure serveis prop teu.');
    return;
  }

  mostrarLoading(true);
  document.getElementById('serveis-container').innerHTML = '';

  try {
    if (CATEGORIES_BBDD.includes(categoria)) {
      const serveis = await cercarBBDD(categoria);
      mostrarLoading(false);
      renderitzarServeisBBDD(serveis);
    } else if (CATEGORIES_NEARBY[categoria]) {
      const llocs = await cercarNearby(categoria, localitzacioActual);
      mostrarLoading(false);
      renderitzarServeisGoogle(llocs);
    } else {
      const llocs = await cercarText(categoria, localitzacioActual);
      mostrarLoading(false);
      renderitzarServeisGoogle(llocs);
    }
  } catch (error) {
    mostrarLoading(false);
    mostrarError('No hem trobat serveis d\'aquesta categoria al codi postal indicat. Prova amb un altre codi postal.');
    console.error(error);
  }
}

function seleccionarCategoria(cat) {
  window.history.pushState({}, '', `?categoria=${cat}`);
  marcarBotoActiu(cat);
  actualitzarTitol(cat);
  carregar(cat);
}

// ── Inicialització ────────────────────────────────────────────────────────────
async function init() {
  const categoria = obtenirCategoria();
  marcarBotoActiu(categoria);
  actualitzarTitol(categoria);

  // Comprovar sessió i obtenir codi postal si està loguejat
  try {
    const r = await fetch('../scripts/php/estat-usuari.php');
    const sessio = await r.json();

    if (sessio.logat && sessio.codi_postal) {
      // Usuari registrat: usar el seu codi postal automàticament
      const cp = sessio.codi_postal;
      localitzacioActual = await geocodarCP(cp);

      document.getElementById('bloc-cp-registrat').style.display = 'block';
      document.getElementById('text-cp-registrat').textContent = cp;

      if (categoria) carregar(categoria);

    } else {
      // Usuari no registrat: mostrar formulari de codi postal
      document.getElementById('bloc-cp-anonim').style.display = 'block';

      document.getElementById('btn-cp').addEventListener('click', async () => {
        const cp = document.getElementById('input-cp').value.trim();
        const errorEl = document.getElementById('error-cp');

        if (!/^\d{5}$/.test(cp)) {
          errorEl.textContent = 'Introdueix un codi postal vàlid de 5 dígits.';
          return;
        }
        errorEl.textContent = '';

        try {
          localitzacioActual = await geocodarCP(cp);
          document.getElementById('bloc-cp-anonim').style.display = 'none';
          document.getElementById('bloc-cp-registrat').style.display = 'block';
          document.getElementById('text-cp-registrat').textContent = cp;

          const catActual = obtenirCategoria();
          if (catActual) carregar(catActual);
        } catch {
          errorEl.textContent = 'No s\'ha trobat el codi postal. Prova\'n un altre.';
        }
      });

      // Permetre enviar amb Enter
      document.getElementById('input-cp').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-cp').click();
      });

      if (categoria) {
        mostrarMissatge('Introdueix el teu codi postal per veure serveis prop teu.');
      }
    }
  } catch (e) {
    console.error('Error comprovant sessió:', e);
    document.getElementById('bloc-cp-anonim').style.display = 'block';
  }

  // Botons de categoria
  document.querySelectorAll('.categories-nav button').forEach(btn => {
    btn.addEventListener('click', () => seleccionarCategoria(btn.dataset.cat));
  });
}

document.addEventListener('DOMContentLoaded', init);
