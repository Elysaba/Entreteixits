async function init() {
  const params     = new URLSearchParams(window.location.search);
  const nomServei  = params.get('nom')  || '';
  const font       = params.get('font') || '';
  const id         = params.get('id')   || '';
  const categoria  = params.get('cat')  || '';
  const adreca     = params.get('adreca') || '';

  // Mostrar nom del servei
  if (nomServei) {
    document.getElementById('contactar-servei-nom').textContent = nomServei;
  }

  // Comprovar sessió
  let sessio = { logat: false };
  try {
    const r = await fetch('../scripts/php/estat-usuari.php');
    sessio  = await r.json();
  } catch { /* continua sense sessió */ }

  if (!sessio.logat) {
    document.getElementById('contactar-auth-msg').style.display = 'block';
    return;
  }

  // Mostrar formulari i pre-omplir camps
  const form = document.getElementById('form-contactar');
  form.style.display = 'block';
  document.getElementById('contacte-nom').value     = sessio.nom   || '';
  document.getElementById('contacte-email').value   = sessio.email || '';
  document.getElementById('contacte-empresa').value = nomServei;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const nom_contacte   = document.getElementById('contacte-nom').value.trim();
    const email_contacte = document.getElementById('contacte-email').value.trim();
    const missatge       = document.getElementById('contacte-missatge').value.trim();

    if (!nom_contacte || !email_contacte || !missatge) return;

    document.getElementById('contacte-ok').style.display    = 'none';
    document.getElementById('contacte-error').style.display = 'none';

    try {
      const r = await fetch('../scripts/php/afegir-contacte.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom_contacte, email_contacte, missatge,
          nom_servei: nomServei, categoria, font, id_extern: id, adreca
        })
      });
      const res = await r.json();

      if (res.ok) {
        document.getElementById('contacte-ok').style.display    = 'block';
        document.getElementById('contacte-missatge').value      = '';
      } else {
        document.getElementById('contacte-error').style.display = 'block';
      }
    } catch {
      document.getElementById('contacte-error').style.display = 'block';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
