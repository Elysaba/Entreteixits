const NOMS_CATEGORIA = {
  llar: 'Llar', activitats: 'Activitats',
  desplacaments: 'Desplaçaments', gestions: 'Gestions', acompanyament: 'Acompanyament'
};

async function init() {
  const r = await fetch('../scripts/php/estat-usuari.php');
  const sessio = await r.json();

  if (!sessio.logat) {
    document.getElementById('contactes-container').innerHTML =
      '<p>Has d\'<a href="login.html">iniciar sessió</a> per veure els teus contactes.</p>';
    return;
  }

  const r2 = await fetch('../scripts/php/get-contactes.php');
  const contactes = await r2.json();
  const contenidor = document.getElementById('contactes-container');

  if (!contactes.length) {
    contenidor.innerHTML = '<p class="missatge-buit">Encara no has contactat cap servei.</p>';
    return;
  }

  contenidor.innerHTML = '';
  contactes.forEach(c => {
    const data = new Date(c.data_contacte).toLocaleDateString('ca-ES');
    const article = document.createElement('article');
    article.className = 'service-card';
    article.innerHTML = `
      <h3>${c.nom_servei}</h3>
      ${c.categoria ? `<p class="fitxa-cat-badge">${NOMS_CATEGORIA[c.categoria] || c.categoria}</p>` : ''}
      ${c.adreca    ? `<p class="adreca">${c.adreca}</p>` : ''}
      <p class="missatge-contacte-resum">"${c.missatge}"</p>
      <p class="data-contacte">Enviat el ${data}</p>
    `;
    contenidor.appendChild(article);
  });
}

document.addEventListener('DOMContentLoaded', init);
