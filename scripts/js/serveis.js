/* Gestionarem el formulari de la cerca del serveis, basant-nos amb:
    - Codi postal
    - Radi
    - Interessos
    - Subcategories
 * Aquesta pàgina es personalitza segons:
 *  - Visita anònima, que no està registrat: mostrem totes les categories
 *  - Usuari registrat: tant el codi postal com els interessos es recupera de la base de dades i es personalitza
 */


// ---------------------------------------------------------------------------
// DADES ESTÀTIQUES: Mapeigs i configuració de categories
// ---------------------------------------------------------------------------

// Noms llegibles per a l'usuari de cada slug de categoria
const NOMS_CATEGORIA = {
  llar:          'Llar',
  activitats:    'Activitats',
  desplacaments: 'Desplaçaments',
  gestions:      'Gestions',
  acompanyament: 'Acompanyament'
};

// Llista de categories que tenen subcategories per refinar la cerca
const CATEGORIES_AMB_SUB = ['llar', 'desplacaments', 'activitats'];

// Definició de les subcategories per a cada categoria que les té
// Cada entrada té: id (valor que s'envia per URL) i label (text que veu l'usuari)
const SUBCATEGORIES = {
  llar: [
    { id: 'tots', label: 'Tots' },
    { id: 'bricolatge', label: 'Bricolatge' },
    { id: 'neteja', label: 'Neteja de la llar' },
    { id: 'menjar', label: 'Menjar a domicili' }
  ],
  desplacaments: [
    { id: 'tots', label: 'Tots' },
    { id: 'transport', label: 'Transport adaptat' },
    { id: 'taxi', label: 'Taxi' }
  ],
  activitats: [
    { id: 'tots', label: 'Tots' },
    { id: 'tallers', label: 'Tallers / cursos' },
    { id: 'excursions', label: 'Excursions' },
    { id: 'viatges', label: 'Viatges' }
  ]
};

// Taula de conversió: l'ID numèric que guarda la BBDD → slug de categoria
// Necessari per filtrar les category-tiles quan l'usuari té interessos guardats
const ID_A_SLUG = {
  1: 'llar',
  2: 'activitats',
  3: 'desplacaments',
  4: 'gestions',
  5: 'acompanyament'
};


// ---------------------------------------------------------------------------
// ESTAT GLOBAL: variables que emmagatzemen l'estat de la pàgina
// ---------------------------------------------------------------------------

let localitzacioActual = null;      // Coordenades {lat, lng} obtingudes del CP geocodificat
let radiCercaKm = 10;               // Radi de cerca en km (per defecte 10)
let codiPostalAplicat = '';         // Últim CP confirmat per l'usuari
let ubicacioAplicada = false;       // Indica si l'usuari ja ha aplicat un CP vàlid
let categoriaSeleccionada = null;   // Slug de la categoria activa (p.ex. 'llar')
let subcategoriaSeleccionada = null; // ID de la subcategoria activa (p.ex. 'neteja')


// =============================================================================
// GEOCODIFICACIÓ
// =============================================================================

// Converteix un codi postal espanyol en coordenades {lat, lng}
// Utilitza l'API gratuïta de Nominatim (OpenStreetMap)
async function geocodarCP(cp) {
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=es&format=json&limit=1`;
  const r = await fetch(url, { headers: { 'Accept-Language': 'ca' } });
  const dades = await r.json();
  if (!dades.length) throw new Error('Codi postal no trobat');
  return { lat: parseFloat(dades[0].lat), lng: parseFloat(dades[0].lon) };
}


// =============================================================================
// UTILITATS
// =============================================================================

// Escapa caràcters HTML perillosos per evitar XSS en contingut dinàmic
// Usa un element temporal del DOM com a mecanisme de sanitització
function escapeHtml(text) {
  const el = document.createElement('div');
  el.textContent = text ?? '';
  return el.innerHTML;
}

// Valida i normalitza el radi: mínim 1 km, màxim 50 km, per defecte 10
function normalitzarRadiKm(km) {
  const n = parseInt(km, 10);
  if (!Number.isFinite(n) || n < 1) return 10;
  return Math.min(n, 50);
}

// Llegeix el valor actual del selector de radi del formulari
function llegirRadiDelFormulari() {
  const select = document.getElementById('input-radi');
  if (!select) return radiCercaKm;
  return normalitzarRadiKm(select.value);
}

// Actualitza l'estat de radi i la UI de confirmació quan l'usuari canvia el selector
// Només actua si ja hi ha una ubicació aplicada prèviament
function sincronitzarUbicacioActiva() {
  if (!ubicacioAplicada) return;
  radiCercaKm = llegirRadiDelFormulari();
  const selectRadi = document.getElementById('input-radi');
  if (selectRadi) selectRadi.value = String(radiCercaKm);
  actualitzarInfoUbicacio(codiPostalAplicat);
}


// =============================================================================
// ACTUALITZAR UI
// =============================================================================

// Mostra el pas de tria de servei (les category-tiles) que inicialment estava ocult
function mostrarPasTriarServei() {
  document.getElementById('pas-triar-servei').hidden = false;
}

// Actualitza el bloc de confirmació que indica el CP i radi actius
function actualitzarInfoUbicacio(cp) {
  const wrap = document.getElementById('cp-aplicat-wrap');
  const info = document.getElementById('cp-aplicat-info');
  if (wrap) wrap.hidden = false;
  info.innerHTML = `Cerca activa prop de <strong>${escapeHtml(cp)}</strong> en un radi de <strong>${radiCercaKm} km</strong>.`;
}

// Afegeix la classe 'is-selected' al botó de la categoria clicada i la treu de la resta
function marcarServeiPrincipal(categoria) {
  document.querySelectorAll('.category-tile-btn').forEach(btn => {
    btn.classList.toggle('is-selected', btn.dataset.cat === categoria);
  });
}

// Afegeix la classe 'active' al botó de subcategoria seleccionat i la treu de la resta
function marcarSubcategoriaActiva(sub) {
  document.querySelectorAll('#subcategories-nav .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sub === sub);
  });
}

// Construeix dinàmicament els botons de subcategoria al DOM
// Neteja el contingut anterior i afegeix un botó per cada subcategoria de la categoria
function renderitzarSubcategories(categoria) {
  const nav = document.getElementById('subcategories-nav');
  const intro = document.getElementById('subcategories-intro');
  const llista = SUBCATEGORIES[categoria] || [];

  intro.textContent = `Has triat ${NOMS_CATEGORIA[categoria]}. Ara concreta què necessites:`;
  nav.innerHTML = '';

  llista.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.dataset.sub = item.id;   // Emmagatzema l'id per identificar-lo al clic
    btn.textContent = item.label;
    btn.addEventListener('click', () => seleccionarSubcategoria(item.id));
    nav.appendChild(btn);
  });
}


// =============================================================================
// NAVEGACIÓ
// =============================================================================

// Construeix la URL de resultats amb els paràmetres actuals i redirigeix l'usuari
// Si la subcategoria és 'tots' no s'afegeix per mantenir URLs netes
function redirigirAResultats(categoria, sub) {
  const params = new URLSearchParams({
    cp: codiPostalAplicat,
    radi: radiCercaKm,
    categoria
  });
  if (sub && sub !== 'tots') params.set('sub', sub);
  window.location.href = `resultats-serveis.html?${params.toString()}`;
}

// Gestiona el clic sobre una category-tile:
// 1. Comprova que hi hagi ubicació aplicada (sinó mostra error)
// 2. Marca la categoria com a seleccionada
// 3. Si té subcategories → mostra el pas de subcategories sense redirigir
// 4. Si NO té subcategories → redirigeix directament als resultats
function seleccionarServeiPrincipal(categoria) {
  if (!ubicacioAplicada) {
    document.getElementById('error-cp').textContent =
      'Primer introdueix el codi postal i clica el botó.';
    return;
  }

  document.getElementById('error-cp').textContent = '';
  categoriaSeleccionada = categoria;
  subcategoriaSeleccionada = null;
  marcarServeiPrincipal(categoria);

  // Amaguem el pas de subcategories per si ja n'hi havia un visible d'abans
  document.getElementById('pas-subcategories').hidden = true;

  if (CATEGORIES_AMB_SUB.includes(categoria)) {
    renderitzarSubcategories(categoria);
    document.getElementById('pas-subcategories').hidden = false;
    return;
  }

  redirigirAResultats(categoria, 'tots');
}

// Gestiona el clic sobre un botó de subcategoria i redirigeix als resultats
function seleccionarSubcategoria(sub) {
  if (!categoriaSeleccionada) return;
  subcategoriaSeleccionada = sub;
  marcarSubcategoriaActiva(sub);
  redirigirAResultats(categoriaSeleccionada, sub);
}

// Aplica una ubicació (CP + radi):
// 1. Geocodifica el CP via Nominatim
// 2. Desa les coordenades i marca l'estat com a "aplicat"
// 3. Actualitza els camps del formulari per reflectir els valors actuals
// 4. Si ja hi havia una categoria triada (cas: tornada de resultats), restaura l'estat visual
async function aplicarUbicacio(cp, radiKm) {
  localitzacioActual = await geocodarCP(cp);
  codiPostalAplicat = cp;
  radiCercaKm = normalitzarRadiKm(radiKm);
  ubicacioAplicada = true;

  const inputCp = document.getElementById('input-cp');
  const selectRadi = document.getElementById('input-radi');
  if (inputCp) inputCp.value = cp;
  if (selectRadi) selectRadi.value = String(radiCercaKm);

  actualitzarInfoUbicacio(cp);
  mostrarPasTriarServei();

  // Si l'usuari havia triat categoria prèviament (p.ex. tornant de resultats),
  // restaurem la selecció visual sense redirigir de nou
  if (categoriaSeleccionada) {
    marcarServeiPrincipal(categoriaSeleccionada);
    if (CATEGORIES_AMB_SUB.includes(categoriaSeleccionada)) {
      renderitzarSubcategories(categoriaSeleccionada);
      document.getElementById('pas-subcategories').hidden = false;
      if (subcategoriaSeleccionada) {
        marcarSubcategoriaActiva(subcategoriaSeleccionada);
      }
    }
  }
}


// =============================================================================
// INICIALITZACIÓ
// =============================================================================

// Punt d'entrada principal. S'executa un cop el DOM està llest.
// Responsabilitats:
//   1. Connectar els listeners dels botons i inputs
//   2. Consultar la sessió PHP per personalitzar el formulari (usuari registrat)
//   3. Restaurar l'estat si venim de resultats-serveis.html via URL params
async function init() {
  // Llegim els paràmetres de la URL (cas: tornada des de resultats)
  const params      = new URLSearchParams(window.location.search);
  const categoriaUrl = params.get('categoria');
  const subUrl      = params.get('sub');
  const cpUrl       = params.get('cp');
  const radiUrl     = params.get('radi');

  // Associem el clic de cada category-tile a la funció de selecció
  document.querySelectorAll('.category-tile-btn').forEach(btn => {
    btn.addEventListener('click', () => seleccionarServeiPrincipal(btn.dataset.cat));
  });

  // Listener del botó "Aplicar CP":
  // - Valida el format (5 dígits)
  // - Geocodifica i aplica la ubicació
  document.getElementById('btn-cp').addEventListener('click', async () => {
    const cp = document.getElementById('input-cp').value.trim();
    const radiKm = llegirRadiDelFormulari();
    const errorEl = document.getElementById('error-cp');

    if (!/^\d{5}$/.test(cp)) {
      errorEl.textContent = 'Introdueix un codi postal vàlid de 5 dígits.';
      return;
    }
    errorEl.textContent = '';

    try {
      await aplicarUbicacio(cp, radiKm);
    } catch {
      errorEl.textContent = 'No s\'ha trobat el codi postal. Prova\'n un altre.';
    }
  });

  // Permet confirmar el CP prement Enter al camp de text
  document.getElementById('input-cp').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-cp').click();
  });

  // Quan l'usuari canvia el radi, actualitzem la info de cerca activa
  // (no cal tornar a geocodificar, les coordenades no canvien)
  document.getElementById('input-radi').addEventListener('change', () => {
    if (!ubicacioAplicada) return;
    sincronitzarUbicacioActiva();
  });

  // --- Personalització per a usuari registrat ---
  // Consulta la sessió PHP per saber si l'usuari està logat i recuperar:
  //   - codi_postal: pre-emplena el camp si no ve per URL
  //   - radi: pre-emplena el selector si no ve per URL
  //   - interessos: amaga les category-tiles que no li interessen
  try {
    const r = await fetch('../scripts/php/estat-usuari.php');
    const sessio = await r.json();

    if (sessio.logat) {
      if (sessio.codi_postal && !cpUrl) {
        document.getElementById('input-cp').value = sessio.codi_postal;
      }
      if (sessio.radi && !radiUrl) {
        document.getElementById('input-radi').value = String(normalitzarRadiKm(sessio.radi));
      }

      document.getElementById('btn-cp').textContent = 'Cercar';

      // Si l'usuari té interessos guardats, amaguem les categories que no hi apareixen
      // sessio.interessos és un array d'IDs numèrics (com a la BBDD)
      if (sessio.interessos?.length) {
        const slugs = sessio.interessos.map(id => ID_A_SLUG[id]).filter(Boolean);
        document.querySelectorAll('.category-tile-btn').forEach(btn => {
          btn.hidden = !slugs.includes(btn.dataset.cat);
        });
      }
    }
  } catch (e) {
    console.error('Error comprovant sessió:', e);
  }

  // --- Restaurar estat des de URL params (tornada de resultats-serveis.html) ---
  // Si la URL inclou ?categoria=..., restaurem les variables d'estat
  // perquè en aplicar el CP es pugui tornar a mostrar la selecció visual
  if (categoriaUrl) {
    categoriaSeleccionada = categoriaUrl;
    if (subUrl) subcategoriaSeleccionada = subUrl;
  }

  // Si la URL inclou ?cp=..., apliquem la ubicació automàticament
  // Errors silenciats: l'usuari pot reintroduir el CP manualment si falla
  if (cpUrl) {
    const radiKm = radiUrl ? parseInt(radiUrl, 10) : 10;
    try {
      await aplicarUbicacio(cpUrl, radiKm);
    } catch {
      // l'usuari pot reintroduir el CP manualment
    }
  }
}

// Esperem que el DOM estigui completament carregat abans d'inicialitzar
document.addEventListener('DOMContentLoaded', init);
