// Icona de cor en SVG per al botó de favorit
const SVG_COR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

// Guardem els IDs dels serveis que l'usuari ja té com a favorits
let favoritIds = new Set();

// Consulta get-favorits.php i omple el Set favoritIds amb els IDs dels favorits actuals
async function carregarFavorits() {
  try {
    const r = await fetch('../scripts/php/get-favorits.php');
    const llista = await r.json();
    if (Array.isArray(llista)) {
      llista.forEach(f => favoritIds.add(String(f.id_extern)));
    }
  } catch (e) {
    console.error('Error carregant favorits:', e);
  }
}

// Mostra un missatge temporal sota el botó de favorit (desapareix als 3 segons)
function mostrarMissatgeFav(btn, text) {
  if (btn.parentElement.querySelector('.fav-login-msg')) return; // evitem duplicats
  const msg = document.createElement('p');
  msg.className = 'fav-login-msg';
  msg.textContent = text;
  btn.parentElement.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

// Crida toggle-favorit.php per afegir o eliminar un servei dels favorits
async function toggleFavorit(btnFav, id_services) {
  try {
    const r = await fetch('../scripts/php/toggle-favorit.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_services })
    });
    const resposta = await r.json();
    if (resposta.ok) {
      // Actualitzem el botó i el Set segons si s'ha afegit o eliminat
      const afegit = resposta.estat === 'afegit';
      btnFav.classList.toggle('actiu', afegit);
      if (afegit) favoritIds.add(String(id_services));
      else favoritIds.delete(String(id_services));
    } else if (resposta.error === 'no_auth') {
      mostrarMissatgeFav(btnFav, 'Has d\'iniciar sessió per guardar favorits.');
    } else {
      mostrarMissatgeFav(btnFav, 'No s\'ha pogut guardar el favorit. Torna-ho a intentar.');
    }
  } catch (e) {
    console.error('Error toggle favorit:', e);
    mostrarMissatgeFav(btnFav, 'Error de connexió. Comprova la teva xarxa.');
  }
}

// Consulta get-serveis.php amb la categoria triada
async function carregarResultats(categoriaSlug) {
  const noms = { acompanyament: 'Acompanyament', gestions: 'Gestions' };
  const seccio     = document.getElementById('seccio-resultats');
  const contenidor = document.getElementById('ajudes-container');
  const titolEl    = document.getElementById('resultats-titol');
  const resumEl    = document.getElementById('resultats-resum');

  // Mostrem la secció de resultats
  seccio.hidden = false;
  seccio.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Netegem el contingut anterior
  titolEl.textContent = noms[categoriaSlug] || '';
  resumEl.textContent = '';
  contenidor.innerHTML = '';
  document.getElementById('ajudes-loading').style.display = 'block';

  try {
    const resposta = await fetch(`../scripts/php/get-serveis.php?categoria=${categoriaSlug}`);
    if (!resposta.ok) throw new Error(`Error HTTP ${resposta.status}`);
    const serveis = await resposta.json();

    document.getElementById('ajudes-loading').style.display = 'none';

    if (serveis?.error) {
      contenidor.innerHTML = `<p class="missatge-buit">Error: ${serveis.error}</p>`;
      return;
    }
    if (!serveis?.length) {
      contenidor.innerHTML = '<p class="missatge-buit">No hi ha serveis disponibles en aquesta categoria.</p>';
      return;
    }

    // Mostrem el comptador i generem una card per cada servei
    resumEl.textContent = `${serveis.length} resultat${serveis.length !== 1 ? 's' : ''}`;

    serveis.forEach(servei => {
      const inicial  = (servei.nom || '').trim().charAt(0).toUpperCase() || '?';
      const webHtml  = servei.web ? `<a href="${servei.web}" class="btn-mes-info" target="_blank" rel="noopener noreferrer">Més informació</a>` : '';
      const descHtml = servei.descripcio ? `<p class="recurs-card-desc">${servei.descripcio}</p>` : '';
      const article = document.createElement('article');
      article.className = 'recurs-card';
      article.innerHTML = `
        <div class="recurs-card-img recurs-card-placeholder thumb-${categoriaSlug}">
          <span class="card-initial">${inicial}</span>
        </div>
        <div class="recurs-card-body">
          <div class="card-badge-row">
            <span class="card-badge">${noms[categoriaSlug]}</span>
            <button class="btn-fav" type="button" aria-label="Afegir als favorits">${SVG_COR}</button>
          </div>
          <h3 class="recurs-card-titol">${servei.nom}</h3>
          ${descHtml}
          <div class="card-cta">
            ${webHtml}
          </div>
        </div>
      `;

      // Marquem el botó com a actiu si ja és favorit, i afegim a la llista
      const btnFav = article.querySelector('.btn-fav');
      if (favoritIds.has(String(servei.id_services))) btnFav.classList.add('actiu');
      btnFav.addEventListener('click', () => toggleFavorit(btnFav, servei.id_services));

      contenidor.appendChild(article);
    });

  } catch (e) {
    document.getElementById('ajudes-loading').style.display = 'none';
    contenidor.innerHTML = '<p class="missatge-buit">No hem pogut carregar els serveis. Torna-ho a provar.</p>';
    console.error(e);
  }
}
function seleccionarCategoria(categoriaSlug) {
  document.querySelectorAll('.category-tile-btn').forEach(btn => {
    btn.classList.toggle('is-selected', btn.dataset.cat === categoriaSlug);
  });
  carregarResultats(categoriaSlug);
}

document.addEventListener('DOMContentLoaded', async () => {
  await carregarFavorits();
  document.querySelectorAll('.category-tile-btn').forEach(btn => {
    btn.addEventListener('click', () => seleccionarCategoria(btn.dataset.cat));
  });

  document.getElementById('btn-tornar-opcions').addEventListener('click', () => {
    document.getElementById('seccio-resultats').hidden = true;
    document.querySelectorAll('.category-tile-btn').forEach(btn => btn.classList.remove('is-selected'));
    document.getElementById('pas-triar-categoria').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Si venim des de serveis.html amb ?categoria=..., carreguem directament
  const categoriaUrl = new URLSearchParams(window.location.search).get('categoria');
  if (categoriaUrl === 'gestions' || categoriaUrl === 'acompanyament') {
    seleccionarCategoria(categoriaUrl);
  }
});
