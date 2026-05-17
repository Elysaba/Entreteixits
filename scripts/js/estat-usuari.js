/* Comprova l'estat de sessió de l'usuari i actualitza el menú de navegació.
   Aquest script està present en totes les pàgines. */

/* Cridem estat-usuari.php per saber si l'usuari ha iniciat sessió */
fetch("../scripts/php/estat-usuari.php")
    .then(res => res.json())
    .then(sessio => {
        const navAuth = document.querySelector("#nav-auth");
        if (!navAuth) return;

        if (!sessio.logat) return;

        const enPerfil = /usuari\.html$/i.test(window.location.pathname)
            || window.location.pathname.endsWith("/usuari.html");

        if (enPerfil) {
            const navPerfil = document.querySelector("#nav-perfil");
            if (navPerfil) {
                navPerfil.textContent = sessio.nom;
                navPerfil.setAttribute("aria-current", "page");
            }
            navAuth.innerHTML = `<a href="../scripts/php/logout.php">Tancar sessió</a>`;
        } else {
            navAuth.innerHTML = `
                <a href="usuari.html">${sessio.nom}</a>
                <a href="../scripts/php/logout.php">Tancar sessió</a>
            `;
        }
    });

    /* PWA */

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('../sw.js')
    .catch(err => console.warn('ServiceWorker no registrat:', err));
}

