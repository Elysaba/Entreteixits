/* Gestió del perfil d'usuari.
 * Carrega les dades de l'usuari des del servidor, mostra els favorits
(tant de la base de dades com de Google Places) i actualitza els
comptadors (badges) de favorits i contactats.

*/

const noms_categoria = {
    llar: "Llar",
    activitats: "Activitats",
    desplacaments: "Desplaçaments",
    gestions: "Gestions",
    acompanyament: "Acompanyament"
};


// Quan l'usuari mou el control de radi, s'actualitza el valor numèric visible 
document.querySelector("#radi").addEventListener("input", function () {
    document.querySelector("#radi-valor").textContent = this.value;
});

/* Carrega les dades de l'usuari des del servidor i les posem als camps del formulari. 
   Si no hi ha sessió activa, redirigim a la pàgina de login. 
*/

fetch("../scripts/php/usuari.php")
    .then(res => res.json())
    .then(dades => {
        if (dades.error === "no_session") {
            window.location.href = "login.html";
            return;
        }

        document.querySelector("#nom").value    = dades.nom    || "";
        document.querySelector("#email").value  = dades.email  || "";
        document.querySelector("#cp").value     = dades.cp     || "";
        document.querySelector("#idioma").value = dades.idioma || "ca";

        const radi = dades.radi || 10;
        document.querySelector("#radi").value           = radi;
        document.querySelector("#radi-valor").textContent = radi;

        (dades.interessos || []).forEach(id => {
            const checkbox = document.querySelector(`input[name="interessos[]"][value="${id}"]`);
            if (checkbox) checkbox.checked = true;
        });
    });


/* Carrega i mostra els favorits de l'usuari.
   Els favorits poden venir de dos llocs:
   - La base de dades (via get-favorits.php): serveis de la plataforma
   - El localStorage: serveis de Google Places guardats al navegador 
*/

async function carregarFavorits() {
    const contenidor = document.querySelector("#favorits-container");
    const resposta = await fetch("../scripts/php/get-favorits.php");
    const favsBBDD = await resposta.json();
    let favsGoogle = [];
    try {
        const raw = localStorage.getItem("entreteixits_fav_google");
        if (raw) {
            const llista = JSON.parse(raw);
            if (Array.isArray(llista)) {
                favsGoogle = llista
                    .filter(f => typeof f === "object" && f.id && f.nom)
                    .map(f => ({
                        nom_servei: f.nom,
                        categoria: f.categoria || "",
                        adreca: f.adreca || "",
                        font: "google",
                        id_extern: f.id
                    }));
            }
        }
    } catch { /* localStorage no disponible */ }

    /* Combinem les dues fonts en una sola llista */
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
                ${f.categoria ? `<span class="fitxa-cat-badge">${NOMS_CATEGORIA[f.categoria] || f.categoria}</span>` : ""}
                ${f.adreca ? `<span class="adreca"> · ${f.adreca}</span>` : ""}
            </div>
            <button class="btn-treure-favorit" data-font="${f.font}" data-id="${f.id_extern}" data-nom="${f.nom_servei}" title="Treure de favorits">✕</button>
        `;
        contenidor.appendChild(div);
    });

    actualitzarBadgeFavorits();

    //Afegeix l'acció de treure favorit a cada botó ✕
    contenidor.querySelectorAll(".btn-treure-favorit").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (btn.dataset.font === "google") {
                try {
                    const raw = localStorage.getItem("entreteixits_fav_google");
                    let llista = raw ? JSON.parse(raw) : [];
                    llista = llista.filter(f => (typeof f === "object" ? f.id : f) !== btn.dataset.id);
                    localStorage.setItem("entreteixits_fav_google", JSON.stringify(llista));
                } catch { /* */ }
            } else {
                await fetch("../scripts/php/toggle-favorit.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id_services: parseInt(btn.dataset.id) })
                });
            }
            await carregarFavorits();
            actualitzarBadgeFavorits();
        });
    });
    actualitzarBadgeFavorits();
}

// Comptador de favorits
function actualitzarBadgeFavorits() {
    const badge = document.querySelector("#badge-favorits");
    if (!badge) return;
    badge.textContent = document.querySelectorAll("#favorits-container .favorit-item").length;
}

//Conatctas per l'usuari
async function actualitzarBadgeContactats() {
    const badge = document.querySelector("#badge-contactats");
    if (!badge) return;

    /* Contactes de la base de dades */
    let contactesBBDD = [];
    try {
        const resposta = await fetch("../scripts/php/get-contactes.php");
        contactesBBDD = await resposta.json();
        if (!Array.isArray(contactesBBDD)) contactesBBDD = [];
    } catch {
        contactesBBDD = [];
    }

    /* Contactes de Google Places guardats al localStorage */
    let contactesGoogle = [];
    try {
        const raw = localStorage.getItem("entreteixits_contactes_google");
        if (raw) {
            const llista = JSON.parse(raw);
            if (Array.isArray(llista)) {
                contactesGoogle = llista.filter(c => typeof c === "object" && c.nom && c.missatge);
            }
        }
    } catch { /* */ }

    // Filtra els contactes de Google que ja existeixen a la base de dades per no comptar-los dos cops
    const clausBBDD = new Set(
        contactesBBDD.map(c => `${c.nom_servei}|${c.missatge}|${c.data_contacte}`)
    );
    const extraLocalStorage = contactesGoogle.filter(
        c => !clausBBDD.has(`${c.nom}|${c.missatge}|${c.data}`)
    );

    badge.textContent = contactesBBDD.length + extraLocalStorage.length;
}

carregarFavorits();
actualitzarBadgeContactats();
