const NOMS_CATEGORIA = {
  acompanyament: 'Acompanyament',
  gestions:      'Gestions'
};

function escapeHtml(text) {
  const el = document.createElement('div');
  el.textContent = text ?? '';
  return el.innerHTML;
}

function mostrarLoading(visible) {
  document.getElementById('ajudes-loading').style.display = visible ? 'block' : 'none';
}

function crearTargetaRecurs(servei, categoriaSlug) {
  const article = document.createElement('article');
  article.className = 'recurs-card';

  const teFoto = false; // La BBDD no té camp foto per a aquests serveis
  const thumbClass = `thumb-${categoriaSlug}`;

  const fotoHtml = teFoto
    ? `<img class="recurs-card-img" src="${escapeHtml(servei.foto)}" alt="${escapeHtml(servei.nom)}" loading="lazy">`
    : `<div class="recurs-card-img recurs-card-placeholder ${thumbClass}"><span class="card-initial">${escapeHtml((servei.nom || '').trim().charAt(0).toUpperCase() || '?')}</span></div>`;

  const webHtml = servei.web
    ? `<a href="${escapeHtml(servei.web)}" class="btn-mes-info" target="_blank" rel="noopener noreferrer">Més informació</a>`
    : '';

  article.innerHTML = `
    ${fotoHtml}
    <div class="recurs-card-body">
      <span class="card-badge">${escapeHtml(NOMS_CATEGORIA[categoriaSlug] || categoriaSlug)}</span>
      <h3 class="recurs-card-titol">${escapeHtml(servei.nom)}</h3>
      ${servei.descripcio ? `<p class="recurs-card-desc">${escapeHtml(servei.descripcio)}</p>` : ''}
      ${webHtml}
    </div>
  `;

  return article;
}

async function carregarResultats(categoriaSlug) {
  const seccio = document.getElementById('seccio-resultats');
  const contenidor = document.getElementById('ajudes-container');
  const titolEl = document.getElementById('resultats-titol');
  const resumEl = document.getElementById('resultats-resum');

  seccio.hidden = false;
  seccio.scrollIntoView({ behavior: 'smooth', block: 'start' });

  titolEl.textContent = NOMS_CATEGORIA[categoriaSlug] || '';
  resumEl.textContent = '';

  mostrarLoading(true);
  contenidor.innerHTML = '';

  try {
    const r = await fetch(`../scripts/php/get-serveis.php?categoria=${categoriaSlug}`);
    if (!r.ok) throw new Error(`Error ${r.status}`);
    const serveis = await r.json();

    mostrarLoading(false);

    if (!serveis?.length) {
      contenidor.innerHTML = '<p class="missatge-buit">No hi ha serveis disponibles en aquesta categoria.</p>';
      return;
    }

    resumEl.textContent = `${serveis.length} resultat${serveis.length !== 1 ? 's' : ''}`;
    serveis.forEach(s => contenidor.appendChild(crearTargetaRecurs(s, categoriaSlug)));

  } catch (e) {
    mostrarLoading(false);
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

function init() {
  document.querySelectorAll('.category-tile-btn').forEach(btn => {
    btn.addEventListener('click', () => seleccionarCategoria(btn.dataset.cat));
  });

  document.getElementById('btn-tornar-opcions').addEventListener('click', () => {
    document.getElementById('seccio-resultats').hidden = true;
    document.querySelectorAll('.category-tile-btn').forEach(btn => btn.classList.remove('is-selected'));
    document.getElementById('pas-triar-categoria').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Si venim redirigits des de serveis.html amb ?categoria=...
  const params = new URLSearchParams(window.location.search);
  const categoriaUrl = params.get('categoria');
  if (categoriaUrl === 'gestions' || categoriaUrl === 'acompanyament') {
    seleccionarCategoria(categoriaUrl);
  }
}

document.addEventListener('DOMContentLoaded', init);
