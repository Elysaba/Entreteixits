/* Gestionarem el formulari de la cerca dels serveis, basant-nos en:
    - Codi postal
    - Radi
    - Interessos
    - Subcategories
 * Aquesta pàgina es personalitza segons:
 *  - Visita anònima, que no està registrat: mostrem totes les categories
 *  - Usuari registrat: tant el codi postal com els interessos es recupera de la base de dades i es personalitza
 */


//  Declarem les variables necessàries per gestionar les categories i subcategories.

const noms_categoria = {
  llar:          'Llar',
  activitats:    'Activitats',
  desplacaments: 'Desplaçaments',
  gestions:      'Gestions',
  acompanyament: 'Acompanyament'
};

const categories_amb_subcategories = ['llar', 'desplacaments', 'activitats'];

// Definició de les subcategories per a cada categoria que les té
// Cada entrada té: id (valor que s'envia per URL) i label (text que veu l'usuari)
const subcategoria = {
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

// Taula de conversió: l'ID numèric que guarda la BBDD amb la categoria
const id_categoria = {
  1: 'llar',
  2: 'activitats',
  3: 'desplacaments',
  4: 'gestions',
  5: 'acompanyament'
};


// Estat Global: variables que emmagatzemem
let localitzacioActual = null;      // Coordenades {lat, lng} obtingudes del CP geocodificat
let radiCercaKm = 10;               // Radi de cerca en km (per defecte 10)
let codiPostalAplicat = '';         // Últim CP confirmat per l'usuari
let ubicacioAplicada = false;       // Indica si l'usuari ja ha aplicat un CP vàlid
let categoriaSeleccionada = null;   // La categoria activa (pot venir directe de la pàgina d'inici)
let subcategoriaSeleccionada = null; // ID de la subcategoria activa


// Per fer la cerca de codi postal necessitem convertir el codi postal en coordenades {lat, lng}
// Utilitzem l'API gratuïta de Nominatim (OpenStreetMap), ja que la de Google per fer aquesta part té un cost
async function geocodarCP(cp) {
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=es&format=json&limit=1`;
  const r = await fetch(url, { headers: { 'Accept-Language': 'ca' } });
  const dades = await r.json();
  if (!dades.length) throw new Error('Codi postal no trobat');
  return { lat: parseFloat(dades[0].lat), lng: parseFloat(dades[0].lon) };
}

function escapeHtml(text) {
  const el = document.createElement('div');
  el.textContent = text ?? '';
  return el.innerHTML;
}

// Valida i normalitza el radi: mínim 1 km, màxim 1000 km (mateix rang que el perfil), per defecte 10
function normalitzarRadiKm(km) {
  const n = parseInt(km, 10);
  if (!Number.isFinite(n) || n < 1) return 10;
  return Math.min(n, 1000);
}

function actualitzarRadiUI(km) {
  const radi = normalitzarRadiKm(km);
  const input = document.getElementById('input-radi');
  const label = document.getElementById('radi-valor');
  if (input) {
    input.value = String(radi);
    input.setAttribute('aria-valuenow', String(radi));
  }
  if (label) label.textContent = String(radi);
  return radi;
}

// Llegeix el valor actual del control de radi del formulari
function llegirRadiDelFormulari() {
  const input = document.getElementById('input-radi');
  if (!input) return radiCercaKm;
  return normalitzarRadiKm(input.value);
}

// Actualitza l'estat de radi. Només actua si ja hi ha una ubicació aplicada prèviament
function sincronitzarUbicacioActiva() {
  if (!ubicacioAplicada) return;
  radiCercaKm = actualitzarRadiUI(llegirRadiDelFormulari());
  actualitzarInfoUbicacio(codiPostalAplicat);
}

// Mostra el pas de tria de servei. Inicialment, està ocult, per no confondre a l'usuari sobre els passos que realitzem
function mostrarPasTriarServei() {
  document.getElementById('pas-triar-servei').hidden = false;
}

// Actualitza el bloc que indica el codi postal i el radi
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

// Construeix dinàmicament els botons de subcategoria
function renderitzarSubcategories(categoria) {
  const nav = document.getElementById('subcategories-nav');
  const intro = document.getElementById('subcategories-intro');
  const llista = subcategoria[categoria] || [];

  intro.textContent = `Has triat ${noms_categoria[categoria]}. Ara concreta què necessites:`;
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

// Construeix l'URL de resultats amb els paràmetres actuals i redirigeix l'usuari a la pàgina de resultats-serveis.html amb els resultats.
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

  if (categories_amb_subcategories.includes(categoria)) {
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

/* Aplica una ubicació (CP + radi): Desa les coordenades i marca l'estat com a "aplicat"
 * Si ja hi havia una categoria triada (cas: tornada de resultats), restaura l'estat visual
*/
async function aplicarUbicacio(cp, radiKm) {
  localitzacioActual = await geocodarCP(cp);
  codiPostalAplicat = cp;
  radiCercaKm = normalitzarRadiKm(radiKm);
  ubicacioAplicada = true;

  const inputCp = document.getElementById('input-cp');
  if (inputCp) inputCp.value = cp;
  actualitzarRadiUI(radiCercaKm);

  actualitzarInfoUbicacio(cp);
  mostrarPasTriarServei();

  // Si l'usuari havia triat categoria prèviament,restaurem la selecció visual sense redirigir de nou
  if (categoriaSeleccionada) {
    marcarServeiPrincipal(categoriaSeleccionada);
    if (categories_amb_subcategories.includes(categoriaSeleccionada)) {
      renderitzarSubcategories(categoriaSeleccionada);
      document.getElementById('pas-subcategories').hidden = false;
      if (subcategoriaSeleccionada) {
        marcarSubcategoriaActiva(subcategoriaSeleccionada);
      }
    }
  }
}

// Consultem la sessió PHP per personalitzar el formulari (usuari registrat), i restaurem l'estat si venim de resultats-serveis.html via URL paràmetres
async function init() {
  // Llegim els paràmetres de la URL 
  const params      = new URLSearchParams(window.location.search);
  const categoriaUrl = params.get('categoria');
  const subUrl      = params.get('sub');
  const cpUrl       = params.get('cp');
  const radiUrl     = params.get('radi');

  // Associem el clic de cada category-tile a la funció de selecció
  document.querySelectorAll('.category-tile-btn').forEach(btn => {
    btn.addEventListener('click', () => seleccionarServeiPrincipal(btn.dataset.cat));
  });

  // Validem el format del codi postal (5 dígits)
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

  // Permet confirmar el codi postal prement Enter al camp de text
  document.getElementById('input-cp').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-cp').click();
  });

  const inputRadi = document.getElementById('input-radi');
  if (inputRadi) {
    inputRadi.addEventListener('input', () => {
      actualitzarRadiUI(inputRadi.value);
      if (ubicacioAplicada) sincronitzarUbicacioActiva();
    });
  }

 // Personalitzem les dades de l'usuari que ha iniciat la sessió. Aquí cridem l'arxiu estat-usuari.php per extreure la informació necessària. 
  
  try {
    const r = await fetch('../scripts/php/estat-usuari.php');
    const sessio = await r.json();

    if (sessio.logat) {
      if (sessio.codi_postal && !cpUrl) {
        document.getElementById('input-cp').value = sessio.codi_postal;
      }
      if (sessio.radi != null && !radiUrl) {
        radiCercaKm = actualitzarRadiUI(sessio.radi);
      }

      document.getElementById('btn-cp').textContent = 'Cercar';

      // Si l'usuari té interessos guardats, amaguem les categories que no hi apareixen
      if (sessio.interessos?.length) {
        const slugs = sessio.interessos.map(id => id_categoria[id]).filter(Boolean);
        document.querySelectorAll('.category-tile-btn').forEach(btn => {
          btn.hidden = !slugs.includes(btn.dataset.cat);
        });
      }
    }
  } catch (e) {
    console.error('Error comprovant sessió:', e);
  }

  // Si l'URL demana la categoria, gestions o acompanyament ho redirigim a la pàgina ajudes-recursos.html
  if (categoriaUrl === 'gestions' || categoriaUrl === 'acompanyament') {
    window.location.replace(`ajudes-recursos.html?categoria=${categoriaUrl}`);
    return;
  }

  // Quan clickem canviar de cerca, resaturem els valors
  if (categoriaUrl) {
    categoriaSeleccionada = categoriaUrl;
    if (subUrl) subcategoriaSeleccionada = subUrl;
  }

  if (cpUrl) {
    const radiKm = radiUrl ? normalitzarRadiKm(radiUrl) : 10;
    try {
      await aplicarUbicacio(cpUrl, radiKm);
    } catch {
      // l'usuari pot reintroduir el CP manualment
    }
  }
}

// Esperem que el DOM estigui completament carregat abans d'inicialitzar
document.addEventListener('DOMContentLoaded', init);
