const NOMS_CATEGORIA = {
  llar: 'Llar', activitats: 'Activitats',
  desplacaments: 'Desplaçaments', gestions: 'Gestions', acompanyament: 'Acompanyament'
};

document.getElementById('radi').addEventListener('input', function () {
  document.getElementById('radi-valor').textContent = this.value;
});
document.getElementById('num_serveis').addEventListener('input', function () {
  document.getElementById('serveis-valor').textContent = this.value;
});

// Carregar dades del perfil
fetch('../scripts/php/usuari.php')
  .then(res => res.json())
  .then(dades => {
    if (dades.error === 'no_session') {
      window.location.href = 'login.html';
      return;
    }
    document.getElementById('nom').value    = dades.nom || '';
    document.getElementById('email').value  = dades.email || '';
    document.getElementById('cp').value     = dades.cp || '';
    document.getElementById('idioma').value = dades.idioma || 'ca';

    const radi = dades.radi || 10;
    document.getElementById('radi').value = radi;
    document.getElementById('radi-valor').textContent = radi;

    const num = dades.num_serveis || 1;
    document.getElementById('num_serveis').value = num;
    document.getElementById('serveis-valor').textContent = num;

    (dades.interessos || []).forEach(id => {
      const cb = document.querySelector(`input[name="interessos[]"][value="${id}"]`);
      if (cb) cb.checked = true;
    });
  });

// Carregar favorits
async function carregarFavorits() {
  const contenidor = document.getElementById('favorits-container');
  const r = await fetch('../scripts/php/get-favorits.php');
  const favorits = await r.json();

  if (!favorits.length) {
    contenidor.innerHTML = '<p class="missatge-buit">No tens cap servei marcat com a favorit.</p>';
    return;
  }

  contenidor.innerHTML = '';
  favorits.forEach(f => {
    const div = document.createElement('div');
    div.className = 'favorit-item';
    div.innerHTML = `
      <div>
        <strong>${f.nom_servei}</strong>
        ${f.categoria ? `<span class="fitxa-cat-badge">${NOMS_CATEGORIA[f.categoria] || f.categoria}</span>` : ''}
        ${f.adreca ? `<span class="adreca"> · ${f.adreca}</span>` : ''}
      </div>
      <button class="btn-treure-favorit" data-font="${f.font}" data-id="${f.id_extern}" data-nom="${f.nom_servei}" title="Treure de favorits">✕</button>
    `;
    contenidor.appendChild(div);
  });

  contenidor.querySelectorAll('.btn-treure-favorit').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch('../scripts/php/toggle-favorit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          font: btn.dataset.font,
          id_extern: btn.dataset.id,
          nom_servei: btn.dataset.nom,
          categoria: '', adreca: ''
        })
      });
      await carregarFavorits();
    });
  });
}

carregarFavorits();
