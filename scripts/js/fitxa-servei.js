/* Un cop que s'ha obtingut els serveis, es vol mostrar una fitxa del servei en qüestió més complerta.
 * En aquest script el que faig és recullir la informació complementària i mostrar-la
 */

// Clau d'accés a l'API de Google Places per fer consultes de llocs
const GOOGLE_API_KEY = 'AIzaSyDQbx5oBV3j2ZWHksF2YZEhkwxk8uugMsM';

// Declaro les variables necessàries per al funcionament del script

const noms_categoria = {
  llar: 'Llar', activitats: 'Activitats',
  desplacaments: 'Desplaçaments', gestions: 'Gestions', acompanyament: 'Acompanyament'
};

// Variables globals: dades de sessió, si el servei és favorit, i les dades del servei actual
let sessio = null;
let esFavorit   = false;
let dadesServei = {};

function mostrarFitxa() {
  document.getElementById('fitxa-loading').style.display  = 'none';
  document.getElementById('fitxa-contingut').style.display = 'block';
}

function mostrarInicial(nom, categoriaSlug) {
  const el = document.getElementById('fitxa-inicial');
  if (!el) return;
  el.querySelector('.card-initial').textContent = (nom || '?').trim().charAt(0).toUpperCase();
  el.className = `fitxa-inicial thumb-${categoriaSlug || 'llar'}`;
  el.style.display = '';
}

// S'omple el HTML amb els valors
function omplirEl(id, valor) {
  const el = document.getElementById(id);
  if (valor) { el.textContent = valor; el.style.display = ''; }
  else el.style.display = 'none';
}

// Carrega totes les dades del servei des de Google Places en una sola crida
async function carregarDeGoogle(id, categoriaSlug) {
  const r = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'displayName,formattedAddress,nationalPhoneNumber,websiteUri,regularOpeningHours,rating,userRatingCount,photos,editorialSummary'
    }
  });
  if (!r.ok) throw new Error(`Error Google Places: ${r.status}`);
  const lloc = await r.json();

  const nom    = lloc.displayName?.text || 'Servei sense nom';
  const adreca = lloc.formattedAddress  || '';

  dadesServei = { nom_servei: nom, adreca, categoria: categoriaSlug, font: 'google', id_extern: id };

  document.getElementById('fitxa-nom').textContent       = nom;
  document.getElementById('fitxa-categoria').textContent = noms_categoria[categoriaSlug] || categoriaSlug;
  omplirEl('fitxa-adreca',  adreca);
  omplirEl('fitxa-rating',  lloc.rating
    ? `${lloc.rating}${lloc.userRatingCount ? ` (${lloc.userRatingCount} opinions)` : ''}` : '');
  omplirEl('fitxa-telefon', lloc.nationalPhoneNumber || '');
  omplirEl('fitxa-horari',  lloc.regularOpeningHours?.weekdayDescriptions?.join(' · ') || '');

  const webEl = document.getElementById('fitxa-web');
  if (lloc.websiteUri) { webEl.href = lloc.websiteUri; webEl.style.display = ''; }
  else webEl.style.display = 'none';

  if (lloc.editorialSummary?.text) {
    document.getElementById('fitxa-descripcio').textContent = lloc.editorialSummary.text;
    document.getElementById('seccio-descripcio').style.display = '';
  } else {
    document.getElementById('seccio-descripcio').style.display = 'none';
  }

  mostrarInicial(nom, categoriaSlug);
  mostrarFitxa();
}

// Carrega les dades d'un servei creat a la taula SERVICES
async function renderitzarBBDD(id, params) {
  const r = await fetch(`../scripts/php/get-servei.php?id=${id}`);
  const s = await r.json();
  if (!s) throw new Error('Servei no trobat');

  // Guardem les dades a la variable global
  dadesServei = {
    nom_servei:  s.nom,
    adreca:      '',
    categoria:   params.get('cat') || '',
    font:        'bbdd',
    id_services: s.id // ID intern de la Base de dades
  };

  // Omplim la fitxa amb les dades de la BBDD
  document.getElementById('fitxa-nom').textContent       = s.nom_servei;
  document.getElementById('fitxa-categoria').textContent = noms_categoria[dadesServei.categoria] || '';
  omplirEl('fitxa-adreca',  '');
  omplirEl('fitxa-rating',  '');
  omplirEl('fitxa-telefon', s.contacte || '');
  omplirEl('fitxa-horari',  '');

  const webEl = document.getElementById('fitxa-web');
  if (s.web) { webEl.href = s.web; webEl.style.display = ''; }
  else webEl.style.display = 'none';

  // Mostrem la descripció si n'hi ha
  if (s.descripcio) {
    document.getElementById('fitxa-descripcio').textContent = s.descripcio;
    document.getElementById('seccio-descripcio').style.display = '';
  } else {
    document.getElementById('seccio-descripcio').style.display = 'none';
  }

  mostrarInicial(s.nom_servei, dadesServei.categoria);
  mostrarFitxa();
}


// Actualitza l'aspecte visual del botó de favorit (estrella plena/buida i tooltip)
function actualitzarBotoFavorit() {
  const btn = document.getElementById('btn-favorit');
  btn.textContent = esFavorit ? '★' : '☆';
  btn.title       = esFavorit ? 'Treure de favorits' : 'Afegir a favorits';
  btn.classList.toggle('actiu', esFavorit);
}

// Afegeix o treu el servei dels favorits de l'usuari quan es fa clic al botó d'estrella.
async function toggleFavorit() {
   if (!sessio?.logat) { window.location.href = 'login.html'; return; }

  if (dadesServei.font === 'google') {
    const raw = localStorage.getItem('entreteixits_fav_google');
    let llista = raw ? JSON.parse(raw) : [];
    const placeId = dadesServei.id_extern;
    const jaHiEs = llista.some(f => (typeof f === 'object' ? f.id : f) === placeId);
    if (jaHiEs) {
      llista = llista.filter(f => (typeof f === 'object' ? f.id : f) !== placeId);
      esFavorit = false;
    } else {
      llista = llista.filter(f => typeof f === 'object'); // neteja format antic
      llista.push({ id: placeId, nom: dadesServei.nom_servei, categoria: dadesServei.categoria, adreca: dadesServei.adreca || '' });
      esFavorit = true;
    }
    localStorage.setItem('entreteixits_fav_google', JSON.stringify(llista));
    actualitzarBotoFavorit();
    return;
  }

  // Per serveis de la taula Servies, el PHP gestiona l'estat 
  const r   = await fetch('../scripts/php/toggle-favorit.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_services: dadesServei.id_services })
  });
  const res = await r.json();
  // El PHP ens retorna { ok: true, estat: 'afegit' | 'eliminat' }
  if (res.ok) { esFavorit = res.estat === 'afegit'; actualitzarBotoFavorit(); }
}

// Llegeix els paràmetres de la URL, comprova la sessió i carrega la fitxa del servei.
async function init() {
  const params = new URLSearchParams(window.location.search);
  const font   = params.get('font'); // 'google' o 'bbdd'
  const id     = params.get('id');   // ID del servei (Place ID de Google o ID intern)

  // Es comprova que l'usuari hi hagi iniciat sessió
  try {
    const r = await fetch('../scripts/php/estat-usuari.php');
    sessio  = await r.json();
  } catch { sessio = { logat: false }; }

  // Carreguem la fitxa segons la font de dades
  try {
    if (font === 'google') {
      await carregarDeGoogle(id, params.get('cat') || '');
    } else if (font === 'bbdd') {
      await renderitzarBBDD(id, params);
    } else {
      throw new Error('font desconeguda');
    }
  } catch {
    // Si no es pot carregar la fitxa, mostrem un missatge d'error
    document.getElementById('fitxa-loading').innerHTML =
      '<p class="error">No s\'ha pogut carregar la informació del servei.</p>';
    return;
  }

  // Comprovem si el servei ja és favorit de l'usuari (només si té sessió)
  if (sessio?.logat) {
    try {
      if (font === 'google') {
        const raw = localStorage.getItem('entreteixits_fav_google');
        const llista = raw ? JSON.parse(raw) : [];
        esFavorit = Array.isArray(llista) && llista.some(f => (typeof f === 'object' ? f.id : f) === String(id));
      } else {
        // Per BBDD: demanem la llista de favorits al backend i comprovem si hi és
        const r    = await fetch('../scripts/php/get-favorits.php');
        const favs = await r.json();
        esFavorit  = Array.isArray(favs) && favs.some(f => String(f.id_services) === String(id));
      }
    } catch { esFavorit = false; }
    actualitzarBotoFavorit();
  }

  // Registrem el clic al botó de favorit
  document.getElementById('btn-favorit').addEventListener('click', toggleFavorit);

  // Construïm la URL del botó "Contactar" amb les dades del servei ja carregades
  const urlContactar = `contactar.html?font=${font}&id=${encodeURIComponent(id)}&nom=${encodeURIComponent(dadesServei.nom_servei)}&cat=${encodeURIComponent(params.get('cat') || '')}&adreca=${encodeURIComponent(dadesServei.adreca || '')}`;
  document.getElementById('btn-contactar').href = urlContactar;
}

// Quan el DOM estigui completament carregat, iniciem la pàgina
document.addEventListener('DOMContentLoaded', init);
