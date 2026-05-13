const GOOGLE_API_KEY = 'AIzaSyDQbx5oBV3j2ZWHksF2YZEhkwxk8uugMsM';

const NOMS_CATEGORIA = {
  llar: 'Llar', activitats: 'Activitats',
  desplacaments: 'Desplaçaments', gestions: 'Gestions', acompanyament: 'Acompanyament'
};

let sessio      = null;
let esFavorit   = false;
let dadesServei = {};

// ── UI helpers ────────────────────────────────────────────────────────────────
function mostrarFitxa() {
  document.getElementById('fitxa-loading').style.display  = 'none';
  document.getElementById('fitxa-contingut').style.display = 'block';
}

function omplirEl(id, valor) {
  const el = document.getElementById(id);
  if (valor) { el.textContent = valor; el.style.display = ''; }
  else el.style.display = 'none';
}

// ── Renderitzat des de URL params (immediat, sense API) ───────────────────────
function renderitzarDesDeParams(params) {
  const nom       = params.get('nom')    || 'Servei sense nom';
  const adreca    = params.get('adreca') || '';
  const categoria = params.get('cat')    || '';
  const telefon   = params.get('tel')    || '';
  const rating    = params.get('rating') || '';
  const fotoNom   = params.get('foto')   || '';
  const desc      = params.get('desc')   || '';

  dadesServei = {
    nom_servei: nom, adreca, categoria,
    font:      params.get('font'),
    id_extern: params.get('id') || ''
  };

  // Foto
  if (fotoNom) {
    const fotoEl = document.getElementById('fitxa-foto');
    fotoEl.src   = `https://places.googleapis.com/v1/${fotoNom}/media?maxWidthPx=800&key=${GOOGLE_API_KEY}`;
    fotoEl.alt   = nom;
    fotoEl.style.display = 'block';
  }

  document.getElementById('fitxa-nom').textContent       = nom;
  document.getElementById('fitxa-categoria').textContent = NOMS_CATEGORIA[categoria] || categoria;
  omplirEl('fitxa-adreca',  adreca);
  omplirEl('fitxa-rating',  rating ? `⭐ ${rating}` : '');
  omplirEl('fitxa-telefon', telefon ? `📞 ${telefon}` : '');
  omplirEl('fitxa-horari',  '');

  document.getElementById('fitxa-web').style.display = 'none';

  // Descripció
  if (desc) {
    document.getElementById('fitxa-descripcio').textContent = desc;
    document.getElementById('seccio-descripcio').style.display = '';
  } else {
    document.getElementById('seccio-descripcio').style.display = 'none';
  }
  document.getElementById('seccio-preu').style.display = 'none';

  mostrarFitxa();
}

// ── Enriquiment opcional amb Place Details (Google) ───────────────────────────
async function enriquirAmbGoogle(id) {
  try {
    const r = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'nationalPhoneNumber,websiteUri,regularOpeningHours,userRatingCount,rating'
      }
    });
    if (!r.ok) return;
    const lloc = await r.json();

    if (lloc.nationalPhoneNumber) {
      omplirEl('fitxa-telefon', `📞 ${lloc.nationalPhoneNumber}`);
      dadesServei.telefon = lloc.nationalPhoneNumber;
    }
    if (lloc.websiteUri) {
      const webEl = document.getElementById('fitxa-web');
      webEl.href = lloc.websiteUri;
      webEl.style.display = '';
    }
    if (lloc.rating) {
      const count = lloc.userRatingCount ? ` (${lloc.userRatingCount} opinions)` : '';
      omplirEl('fitxa-rating', `⭐ ${lloc.rating}${count}`);
    }
    if (lloc.regularOpeningHours?.weekdayDescriptions?.length) {
      omplirEl('fitxa-horari', lloc.regularOpeningHours.weekdayDescriptions.join(' · '));
    }
  } catch {
    // Enriquiment opcional — si falla, la fitxa ja té les dades bàsiques
  }
}

// ── Carrega servei BBDD ───────────────────────────────────────────────────────
async function renderitzarBBDD(id, params) {
  const r = await fetch(`../scripts/php/get-servei.php?id=${id}`);
  const s = await r.json();
  if (!s) throw new Error('Servei no trobat');

  dadesServei = {
    nom_servei: s.nom,
    adreca:     '',
    categoria:  params.get('cat') || '',
    font:       'bbdd',
    id_extern:  String(s.id)
  };

  document.getElementById('fitxa-nom').textContent       = s.nom;
  document.getElementById('fitxa-categoria').textContent = NOMS_CATEGORIA[dadesServei.categoria] || '';
  omplirEl('fitxa-adreca',  '');
  omplirEl('fitxa-rating',  '');
  omplirEl('fitxa-telefon', s.telefon ? `📞 ${s.telefon}` : '');
  omplirEl('fitxa-horari',  '');

  const webEl = document.getElementById('fitxa-web');
  if (s.web) { webEl.href = s.web; webEl.style.display = ''; }
  else webEl.style.display = 'none';

  if (s.descripcio) {
    document.getElementById('fitxa-descripcio').textContent = s.descripcio;
    document.getElementById('seccio-descripcio').style.display = '';
  } else {
    document.getElementById('seccio-descripcio').style.display = 'none';
  }
  if (s.preu) {
    document.getElementById('fitxa-preu').textContent = s.preu;
    document.getElementById('seccio-preu').style.display = '';
  } else {
    document.getElementById('seccio-preu').style.display = 'none';
  }

  mostrarFitxa();
}

// ── Favorit ───────────────────────────────────────────────────────────────────
function actualitzarBotoFavorit() {
  const btn = document.getElementById('btn-favorit');
  btn.textContent = esFavorit ? '★' : '☆';
  btn.title       = esFavorit ? 'Treure de favorits' : 'Afegir a favorits';
  btn.classList.toggle('actiu', esFavorit);
}

async function toggleFavorit() {
  if (!sessio?.logat) { window.location.href = 'login.html'; return; }
  const r   = await fetch('../scripts/php/toggle-favorit.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dadesServei)
  });
  const res = await r.json();
  if (res.ok) { esFavorit = res.estat === 'afegit'; actualitzarBotoFavorit(); }
}


// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search);
  const font   = params.get('font');
  const id     = params.get('id');

  // Sessió
  try {
    const r = await fetch('../scripts/php/estat-usuari.php');
    sessio  = await r.json();
  } catch { sessio = { logat: false }; }

  // Carregar fitxa
  try {
    if (font === 'google') {
      renderitzarDesDeParams(params);
      if (id) enriquirAmbGoogle(id);
    } else if (font === 'bbdd') {
      await renderitzarBBDD(id, params);
    } else {
      throw new Error('font desconeguda');
    }
  } catch {
    document.getElementById('fitxa-loading').innerHTML =
      '<p class="error">No s\'ha pogut carregar la informació del servei.</p>';
    return;
  }

  // Estat favorit
  if (sessio?.logat) {
    try {
      const r      = await fetch('../scripts/php/get-favorits.php');
      const favs   = await r.json();
      esFavorit    = favs.some(f => f.font === font && f.id_extern === String(id));
    } catch { esFavorit = false; }
    actualitzarBotoFavorit();
  }

  document.getElementById('btn-favorit').addEventListener('click', toggleFavorit);

  // Botó Contactar → pàgina separada
  const urlContactar = `contactar.html?font=${font}&id=${encodeURIComponent(id)}&nom=${encodeURIComponent(params.get('nom') || dadesServei.nom_servei)}&cat=${encodeURIComponent(params.get('cat') || '')}&adreca=${encodeURIComponent(dadesServei.adreca || '')}`;
  document.getElementById('btn-contactar').href = urlContactar;
}

document.addEventListener('DOMContentLoaded', init);
