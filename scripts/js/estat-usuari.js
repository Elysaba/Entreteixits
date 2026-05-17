/* Aquest script ens ajuda a comprovar l'estat de l'usuari, és a dir, per saber si ha iniciat sessió o és un usuari anònim.
 * Aquest script estarà present en totes les pàgines de la web
 */

// Aquí cridem el php estat-usuari on aquest arxiu comprova si tenim l'usuari enregistrat en la taula USERS
fetch('../scripts/php/estat-usuari.php')
  .then(res => res.json())
  .then(sessio => {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;

    if (!sessio.logat) return;

    const enPerfil = /usuari\.html$/i.test(window.location.pathname)
      || window.location.pathname.endsWith('/usuari.html');

    if (enPerfil) {
      const navPerfil = document.getElementById('nav-perfil');
      if (navPerfil) {
        navPerfil.textContent = sessio.nom;
        navPerfil.setAttribute('aria-current', 'page');
      }
      navAuth.innerHTML = `<a href="../scripts/php/logout.php">Tancar sessió</a>`;
    } else {
      navAuth.innerHTML = `
        <a href="usuari.html">${sessio.nom}</a>
        <a href="../scripts/php/logout.php">Tancar sessió</a>
      `;
    }
  });
