/* Gestió del perfil d'usuari.
 * Carrega les dades de l'usuari des del servidor, mostra els favorits
 * (tant de la base de dades com de Google Places) i actualitza els
 * comptadors (badges) de favorits i contactats.
 */

const noms_categoria = {
    llar: "Llar",
    activitats: "Activitats",
    desplacaments: "Desplaçaments",
    gestions: "Gestions",
    acompanyament: "Acompanyament"
};

// Claus de localStorage personalitzades per usuari (s'actualitzen a init amb l'email)
let clauFavGoogle = "entreteixits_fav_google_anom";
let clauContactes = "entreteixits_contactes_google_anom";

document.querySelector("#radi").addEventListener("input", function () {
    document.querySelector("#radi-valor").textContent = this.value;
});

document.querySelectorAll(".perfil-navegacio-item[data-panel]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".perfil-navegacio-item").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".perfil-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.querySelector(`#panel-${btn.dataset.panel}`).classList.add("active");
    });
});

/* Punt d'entrada: carrega les dades de l'usuari, estableix les claus de localStorage
   i inicia la càrrega de favorits i contactes. */
async function init() {
    const res   = await fetch("../scripts/php/usuari.php");
    const dades = await res.json();

    if (dades.error === "no_session") {
        window.location.href = "login.html";
        return;
    }

    // Personalitza les claus de localStorage amb l'email de l'usuari per evitar barrejar dades entre comptes
    if (dades.email) {
        clauFavGoogle = `entreteixits_fav_google_${dades.email}`;
        clauContactes = `entreteixits_contactes_google_${dades.email}`;
    }

    document.querySelector("#sidebar-nom").textContent   = dades.nom   || "—";
    document.querySelector("#sidebar-email").textContent = dades.email || "—";
    document.querySelector("#sidebar-avatar").textContent = dades.nom ? dades.nom.charAt(0).toUpperCase() : "?";

    document.querySelector("#nom").value            = dades.nom            || "";
    document.querySelector("#data-naixement").value = dades.data_naixement || "";
    document.querySelector("#email").value          = dades.email          || "";
    document.querySelector("#cp").value             = dades.cp             || "";
    document.querySelector("#idioma").value         = dades.idioma         || "ca";

    const radi = dades.radi || 10;
    document.querySelector("#radi").value             = radi;
    document.querySelector("#radi-valor").textContent = radi;

    
    (dades.interessos || []).forEach(id => {
        const checkbox = document.querySelector(`input[name="interessos[]"][value="${id}"]`);
        if (checkbox) checkbox.checked = true;
    });

    await carregarFavorits();
    await actualitzarBadgeContactats();
}


/* Carrega i mostra els favorits de l'usuari.
   Els favorits poden venir de dos llocs:
   - La base de dades (via get-favorits.php): serveis de la plataforma
   - El localStorage: serveis de Google Places guardats al navegador */

async function carregarFavorits() {
    const contenidor = document.querySelector("#favorits-container");
    const resposta   = await fetch("../scripts/php/get-favorits.php");
    const favsBBDD   = await resposta.json();

    let favsGoogle = [];
    try {
        const raw = localStorage.getItem(clauFavGoogle);
        if (raw) {
            const llista = JSON.parse(raw);
            if (Array.isArray(llista)) {
                favsGoogle = llista
                    .filter(f => typeof f === "object" && f.id && f.nom)
                    .map(f => ({
                        nom_servei: f.nom,
                        categoria:  f.categoria || "",
                        adreca:     f.adreca    || "",
                        font:       "google",
                        id_extern:  f.id
                    }));
            }
        }
    } catch { /* localStorage no disponible */ }

    // Combinem les dues fonts en una sola llista
    const tots = [...(Array.isArray(favsBBDD) ? favsBBDD : []), ...favsGoogle];

    if (!tots.length) {
        contenidor.innerHTML = "<p class=\"missatge-buit\">No tens cap servei marcat com a favorit.</p>";
        actualitzarBadgeFavorits();
        return;
    }

    // Creem un element per cada favorit i l'afegeix al contenidor
    contenidor.innerHTML = "";
    tots.forEach(f => {
        const div = document.createElement("div");
        div.className = "favorit-item";
        div.innerHTML = `
            <div>
                <strong>${f.nom_servei}</strong>
                ${f.categoria ? `<span class="fitxa-cat-indicador">${noms_categoria[f.categoria] || f.categoria}</span>` : ""}
                ${f.adreca ? `<span class="adreca"> · ${f.adreca}</span>` : ""}
            </div>
            <button class="btn-treure-favorit" data-font="${f.font}" data-id="${f.id_extern}" data-nom="${f.nom_servei}" title="Treure de favorits">✕</button>
        `;
        contenidor.appendChild(div);
    });

    actualitzarBadgeFavorits();

    // Afegeix l'acció de treure favorit a cada botó ✕
    contenidor.querySelectorAll(".btn-treure-favorit").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (btn.dataset.font === "google") {
                // Si és un favorit de Google, l'eliminem del localStorage
                try {
                    const raw  = localStorage.getItem(clauFavGoogle);
                    let llista = raw ? JSON.parse(raw) : [];
                    llista = llista.filter(f => (typeof f === "object" ? f.id : f) !== btn.dataset.id);
                    localStorage.setItem(clauFavGoogle, JSON.stringify(llista));
                } catch { /* */ }
            } else {
                // Si és un favorit de la BD, fem la crida al servidor per eliminar-lo
                await fetch("../scripts/php/toggle-favorit.php", {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ id_services: parseInt(btn.dataset.id) })
                });
            }

            await carregarFavorits();
            actualitzarBadgeFavorits();
        });
    });

    actualitzarBadgeFavorits();
}


// Compta els favorits visibles i actualitza el badge del comptador
function actualitzarBadgeFavorits() {
    const badge = document.querySelector("#badge-favorits");
    if (!badge) return;
    badge.textContent = document.querySelectorAll("#favorits-container .favorit-item").length;
}


/* Compta els contactes de l'usuari (BD + localStorage) i actualitza el badge.
   Evitem duplicats comparant nom, missatge i data entre les dues fonts. */

async function actualitzarBadgeContactats() {
    const badge = document.querySelector("#badge-contactats");
    if (!badge) return;

    // Contactes de la base de dades
    let contactesBBDD = [];
    try {
        const resposta = await fetch("../scripts/php/get-contactes.php");
        contactesBBDD  = await resposta.json();
        if (!Array.isArray(contactesBBDD)) contactesBBDD = [];
    } catch {
        contactesBBDD = [];
    }

    // Contactes de Google Places guardats al localStorage
    let contactesGoogle = [];
    try {
        const raw = localStorage.getItem(clauContactes);
        if (raw) {
            const llista = JSON.parse(raw);
            if (Array.isArray(llista)) {
                contactesGoogle = llista.filter(c => typeof c === "object" && c.nom && c.missatge);
            }
        }
    } catch { /* */ }

    // Filtrem els contactes de Google que ja existeixen a la BD per no comptar-los dos cops
    const clausBBDD = new Set(
        contactesBBDD.map(c => `${c.nom_servei}|${c.missatge}|${c.data_contacte}`)
    );
    const extraLocalStorage = contactesGoogle.filter(
        c => !clausBBDD.has(`${c.nom}|${c.missatge}|${c.data}`)
    );

    badge.textContent = contactesBBDD.length + extraLocalStorage.length;
}


init();
