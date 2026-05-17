/* Comprovem primerament que hi hagi la sessió iniciada, i tots els formularis de contactes, de moment, ho guardem el LocalStorage
 * Es guarda el LocalStorage perquè els serveis de Google Api no els tenim a la Base de dades
*/

const CLAU_CONTACTES_LS = 'entreteixits_contactes_google';

function desarContacteLocalStorage(dades) {
  const raw = localStorage.getItem(CLAU_CONTACTES_LS);
  const llista = raw ? JSON.parse(raw) : [];
  llista.unshift({
    nom: dades.nom,
    categoria: dades.categoria,
    adreca: dades.adreca,
    missatge: dades.missatge,
    data: new Date().toISOString()
  });
  localStorage.setItem(CLAU_CONTACTES_LS, JSON.stringify(llista));
}

//El Formulari de contacte ve amb les dades preomplertes
async function init() {
  const params     = new URLSearchParams(window.location.search);
  const nomServei  = params.get('nom')    || '';
  const font       = params.get('font')   || '';
  const id         = params.get('id')     || '';
  const categoria  = params.get('cat')    || '';
  const adreca     = params.get('adreca') || '';

  if (nomServei) {
    document.getElementById('contactar-servei-nom').textContent = nomServei;
  }

  // Comprovar si l'usuari té sessió activa
  let sessio = { logat: false };
  try {
    const r = await fetch('../scripts/php/estat-usuari.php');
    sessio  = await r.json();
  } catch { /* continua sense sessió */ }

  // Si no hi ha sessió, mostrar avís
  if (!sessio.logat) {
    document.getElementById('contactar-auth-msg').style.display = 'block';
    return;
  }

  // Preomplir els camps amb les dades de sessió
  const form = document.getElementById('form-contactar');
  const missatgeEl = document.getElementById('contacte-missatge');
  const errorEl = document.getElementById('contacte-error');

  form.style.display = 'block';
  document.getElementById('contacte-nom').value     = sessio.nom   || '';
  document.getElementById('contacte-email').value   = sessio.email || '';
  document.getElementById('contacte-empresa').value = nomServei;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const missatge = missatgeEl.value.trim();
    document.getElementById('contacte-ok').style.display = 'none';
    errorEl.style.display = 'none';
    missatgeEl.classList.remove('camp-error');

    if (!missatge) {
      errorEl.textContent = 'Has d\'escriure un missatge abans d\'enviar.';
      errorEl.style.display = 'block';
      missatgeEl.classList.add('camp-error');
      missatgeEl.focus();
      return;
    }

    const contacteLocal = { nom: nomServei, categoria, adreca, missatge };

    // Serveis de Google: només localStorage
    if (font === 'google') {
      try {
        desarContacteLocalStorage(contacteLocal);
        document.getElementById('contacte-ok').style.display = 'block';
        missatgeEl.value = '';
      } catch {
        errorEl.textContent = 'Error en enviar el missatge. Torna-ho a intentar.';
        errorEl.style.display = 'block';
      }
      return;
    }

    // Serveis de la BBDD: es desen a la base de dades (visibles a Usuaris via PHP)
    try {
      const r = await fetch('../scripts/php/afegir-contacte.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missatge, font, id_extern: id })
      });
      const res = await r.json();

      if (res.ok) {
        document.getElementById('contacte-ok').style.display = 'block';
        missatgeEl.value = '';
      } else {
        errorEl.textContent = 'Error en enviar el missatge. Torna-ho a intentar.';
        errorEl.style.display = 'block';
      }
    } catch {
      errorEl.textContent = 'Error en enviar el missatge. Torna-ho a intentar.';
      errorEl.style.display = 'block';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
