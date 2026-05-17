// Icona de cor en SVG per al botó de favorit
const SVG_COR = ``;

// Guardem els IDs dels serveis que l'usuari ja té com a favorits
let favoritIds = new Set();

// Consulta get-favorits.php i omple el Set favoritIds amb els IDs dels favorits actuals
async function carregarFavorits() {
    try {
        const r = await fetch("../scripts/php/get-favorits.php");
        const llista = await r.json();
        if (Array.isArray(llista)) {
            llista.forEach(f => favoritIds.add(String(f.id_extern)));
        }
    } catch (e) {
        console.error("Error carregant favorits:", e);
    }
}

// Mostra un missatge temporal sota el botó de favorit (desapareix als 3 segons)
function mostrarMissatgeFav(btn, text) {
    if (btn.parentElement.querySelector(".favorit-login-missatge")) return; // evitem duplicats
    const msg = document.createElement("p");
    msg.className = "favorit-login-missatge";
    msg.textContent = text;
    btn.parentElement.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

// Crida toggle-favorit.php per afegir o eliminar un servei dels favorits
async function toggleFavorit(btnFav, id_services) {
    try {
        const r = await fetch("../scripts/php/toggle-favorit.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_services })
        });
        const resposta = await r.json();
        if (resposta.ok) {
            // Actualitzem el botó i el Set segons si s'ha afegit o eliminat
            const afegit = resposta.estat === "afegit";
            btnFav.classList.toggle("actiu", afegit);
            if (afegit) favoritIds.add(String(id_services));
            else favoritIds.delete(String(id_services));
        } else if (resposta.error === "no_auth") {
            mostrarMissatgeFav(btnFav, "Has d'iniciar sessió per guardar favorits.");
        } else {
            mostrarMissatgeFav(btnFav, "No s'ha pogut guardar el favorit. Torna-ho a intentar.");
        }
    } catch (e) {
        console.error("Error toggle favorit:", e);
        mostrarMissatgeFav(btnFav, "Error de connexió. Comprova la teva xarxa.");
    }
}

// Consulta get-serveis.php amb la categoria triada
async function carregarResultats(categoriaSlug) {
    const noms = { acompanyament: "Acompanyament", gestions: "Gestions" };
    const seccio     = document.querySelector("#seccio-resultats");
    const contenidor = document.querySelector("#ajudes-container");
    const titolEl    = document.querySelector("#resultats-titol");
    const resumEl    = document.querySelector("#resultats-resum");

    // Mostrem la secció de resultats
    seccio.classList.remove("hidden");
    seccio.scrollIntoView({ behavior: "smooth", block: "start" });

    // Netegem el contingut anterior
    titolEl.textContent = noms[categoriaSlug] || "";
    resumEl.textContent = "";
    contenidor.innerHTML = "";
    document.querySelector("#ajudes-loading").style.display = "block";

    try {
        const resposta = await fetch(`../scripts/php/get-serveis.php?categoria=${categoriaSlug}`);
        if (!resposta.ok) throw new Error(`Error HTTP ${resposta.status}`);
        const serveis = await resposta.json();

        document.querySelector("#ajudes-loading").style.display = "none";

        if (serveis?.error) {
            contenidor.innerHTML = `<p class="missatge-buit">Error: ${serveis.error}</p>`;
            return;
        }
        if (!serveis?.length) {
            contenidor.innerHTML = "<p class=\"missatge-buit\">No hi ha serveis disponibles en aquesta categoria.</p>";
            return;
        }

        // Mostrem el comptador i generem una card per cada servei
        resumEl.textContent = `${serveis.length} resultat${serveis.length !== 1 ? "s" : ""}`;

        serveis.forEach(servei => {
            const inicial  = (servei.nom || "").trim().charAt(0).toUpperCase() || "?";
            const webHtml  = servei.web ? `<a href="${servei.web}" class="btn-mes-info" target="_blank" rel="noopener noreferrer">Més informació</a>` : "";
            const descHtml = servei.descripcio ? `<p class="recurs-targeta-descripcio">${servei.descripcio}</p>` : "";
            const article = document.createElement("article");
            article.className = "recurs-targeta";
            article.innerHTML = `
                <div class="recurs-targeta-placeholder thumb-${categoriaSlug}">
                    <span class="card-initial">${inicial}</span>
                </div>
                <div class="recurs-targeta-body">
                    <div class="targeta-badge-row">
                        <span class="targeta-badge">${noms[categoriaSlug]}</span>
                        <button class="btn-favorit" type="button" aria-label="Afegir als favorits">${SVG_COR}</button>
                    </div>
                    <h3 class="recurs-targeta-titol">${servei.nom}</h3>
                    ${descHtml}
                    ${webHtml}
                </div>
            `;

            // Marquem el botó com a actiu si ja és favorit, i afegim a la llista
            const btnFav = article.querySelector(".btn-favorit");
            if (favoritIds.has(String(servei.id_services))) btnFav.classList.add("actiu");
            btnFav.addEventListener("click", () => toggleFavorit(btnFav, servei.id_services));

            contenidor.appendChild(article);
        });

    } catch (e) {
        document.querySelector("#ajudes-loading").style.display = "none";
        contenidor.innerHTML = "<p class=\"missatge-buit\">No hem pogut carregar els serveis. Torna-ho a provar.</p>";
        console.error(e);
    }
}

function seleccionarCategoria(categoriaSlug) {
    document.querySelectorAll(".category-tile-btn").forEach(btn => {
        btn.classList.toggle("is-selected", btn.dataset.cat === categoriaSlug);
    });
    carregarResultats(categoriaSlug);
}

document.addEventListener("DOMContentLoaded", async () => {
    await carregarFavorits();
    document.querySelectorAll(".category-tile-btn").forEach(btn => {
        btn.addEventListener("click", () => seleccionarCategoria(btn.dataset.cat));
    });

    document.querySelector("#btn-tornar-opcions").addEventListener("click", () => {
        document.querySelector("#seccio-resultats").classList.add("hidden");
        document.querySelectorAll(".category-tile-btn").forEach(btn => btn.classList.remove("is-selected"));
        document.querySelector("#pas-triar-categoria").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Si venim des de serveis.html amb ?categoria=..., carreguem directament
    const categoriaUrl = new URLSearchParams(window.location.search).get("categoria");
    if (categoriaUrl === "gestions" || categoriaUrl === "acompanyament") {
        seleccionarCategoria(categoriaUrl);
    }
});
