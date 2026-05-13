fetch('../scripts/php/estat-usuari.php')
  .then(res => res.json())
  .then(sessio => {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;

    if (sessio.logat) {
      const base = window.location.pathname.includes('/public/') ? '' : 'public/';
      navAuth.innerHTML = `
        <a href="${base}usuari.html">${sessio.nom}</a>
        <a href="../scripts/php/logout.php">Tancar sessió</a>
      `;
    }
  });
