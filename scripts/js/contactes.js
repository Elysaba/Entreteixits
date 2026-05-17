/* Aquest script el que pretén és fer la comprovació de la sessió de l'usuari, i recuperar els missatges enviats via:
  - LocalStorages (que és el que funciona actualment)
  - Taula de Contacted guardat en la nostra Base de dades (en una fase posterior)
 */

const noms_categoria = {
    llar: "Llar",
    activitats: "Activitats",
    desplacaments: "Desplaçaments",
    gestions: "Gestions",
    acompanyament: "Acompanyament"
};

// Clau de localStorage personalitzada per usuari (s'actualitza amb l'email)
let clauContactes = "entreteixits_contactes_google_anom";

// Comprovem si l'usuari té sessió activa
async function init() {
    const r = await fetch("../scripts/php/estat-usuari.php");
    const sessio = await r.json();

    // Personalitzem la clau de localStorage amb l'email per evitar barrejar dades entre comptes
    if (sessio.logat && sessio.email) clauContactes = `entreteixits_contactes_google_${sessio.email}`;

    if (!sessio.logat) {
        document.querySelector("#contactes-container").innerHTML =
            "<p>Has d'<a href=\"login.html\">iniciar sessió</a> per veure els teus contactes.</p>";
        return;
    }

    // En el cas que tinguem missatges enviats als serveis de la nostra Base de dades, ho recuperem via PHP
    const r2 = await fetch("../scripts/php/get-contactes.php");
    const contactesBBDD = await r2.json();

    // Carreguem els contactes de serveis de Google Places des del localStorage
    let contactesGoogle = [];
    try {
        const raw = localStorage.getItem(clauContactes);
        if (raw) {
            const llista = JSON.parse(raw);
            if (Array.isArray(llista)) {
                contactesGoogle = llista
                    .filter(c => typeof c === "object" && c.nom && c.missatge)
                    .map(c => ({
                        nom_servei:    c.nom,
                        categoria:     c.categoria     || "",
                        adreca:        c.adreca        || "",
                        font:          "google",
                        missatge:      c.missatge,
                        data_contacte: c.data
                    }));
            }
        }
    } catch { /* localStorage no disponible */ }

    // Fusionem les dues llistes i ordenem de més recent a més antic
    const tots = [
        ...(Array.isArray(contactesBBDD) ? contactesBBDD : []),
        ...contactesGoogle
    ].sort((a, b) => new Date(b.data_contacte) - new Date(a.data_contacte));

    const contenidor = document.querySelector("#contactes-container");

    if (!tots.length) {
        contenidor.innerHTML = "<p class=\"missatge-buit\">Encara no has contactat cap servei.</p>";
        return;
    }

    // Renderitzem una targeta per cada contacte
    contenidor.innerHTML = "";
    tots.forEach(c => {
        const data = new Date(c.data_contacte).toLocaleDateString("ca-ES");
        const article = document.createElement("article");
        article.className = "service-card";
        article.innerHTML = `
            <h3>${c.nom_servei}</h3>
            ${c.categoria ? `<p class="fitxa-cat-indicador">${noms_categoria[c.categoria] || c.categoria}</p>` : ""}
            ${c.adreca    ? `<p class="adreca">${c.adreca}</p>` : ""}
            <p class="missatge-contacte-resum">"${c.missatge}"</p>
            <p class="data-contacte">Enviat el ${data}</p>
        `;
        contenidor.appendChild(article);
    });
}

document.addEventListener("DOMContentLoaded", init);
