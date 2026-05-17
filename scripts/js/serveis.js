/* Gestiono el formulari de la cerca dels serveis, basant-me en:
    - Codi postal
    - Radi
    - Interessos
    - Subcategories
 * Aquesta pàgina es personalitza segons:
 *  - Visita anònima, que no està registrat: es mostra totes les categories
 *  - Usuari registrat: tant el codi postal com els interessos es recupera de la base de dades i es personalitza
 */


//  Es declara les variables necessàries per gestionar les categories i subcategories.

const noms_categoria = {
    llar:          "Llar",
    activitats:    "Activitats",
    desplacaments: "Desplaçaments",
    gestions:      "Gestions",
    acompanyament: "Acompanyament"
};

const categories_amb_subcategories = ["llar", "desplacaments", "activitats"];

// Definició de les subcategories. No totes els interessos tenen subcategories
const subcategoria = {
    llar: [
        { id: "tots", label: "Tots" },
        { id: "bricolatge", label: "Bricolatge" },
        { id: "neteja", label: "Neteja de la llar" },
        { id: "menjar", label: "Menjar a domicili" }
    ],
    desplacaments: [
        { id: "tots", label: "Tots" },
        { id: "transport", label: "Transport adaptat" },
        { id: "taxi", label: "Taxi" }
    ],
    activitats: [
        { id: "tots", label: "Tots" },
        { id: "tallers", label: "Tallers / cursos" },
        { id: "excursions", label: "Excursions" },
        { id: "viatges", label: "Viatges" }
    ]
};

// Taula de conversió: l'ID numèric que guarda la base de dades de categoria
const id_categoria = {
    1: "llar",
    2: "activitats",
    3: "desplacaments",
    4: "gestions",
    5: "acompanyament"
};


// Estat Global: variables que emmagatzemem
let localitzacioActual = null;       
let radiCercaKm = 10;               
let codiPostalAplicat = "";          
let ubicacioAplicada = false;        
let categoriaSeleccionada = null;    
let subcategoriaSeleccionada = null; 


// Per fer la cerca de codi postal s'ha de convertir el codi postal en coordenades {lat, lng}
// Per aquest cas estic utilitzant l'API gratuïta de Nominatim (OpenStreetMap), ja que la de Google per fer aquesta part té un cost
async function geocodarCP(cp) {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=es&format=json&limit=1`;
    const r = await fetch(url, { headers: { "Accept-Language": "ca" } });
    const dades = await r.json();
    if (!dades.length) throw new Error("Codi postal no trobat");
    return { lat: parseFloat(dades[0].lat), lng: parseFloat(dades[0].lon) };
}

function escapeHtml(text) {
    const el = document.createElement("div");
    el.textContent = text ?? "";
    return el.innerHTML;
}

// Valida i normalitza el radi: mínim 1 km, màxim 1000 km (mateix rang que el perfil), per defecte 10
function normalitzarRadiKm(km) {
    const n = parseInt(km, 10);
    if (!Number.isFinite(n) || n < 1) return 10;
    return Math.min(n, 1000);
}

function actualitzarRadiUI(km) {
    const radi = normalitzarRadiKm(km);
    const input = document.querySelector("#input-radi");
    const label = document.querySelector("#radi-valor");
    if (input) {
        input.value = String(radi);
        input.setAttribute("aria-valuenow", String(radi));
    }
    if (label) label.textContent = String(radi);
    return radi;
}

// Llegeix el valor actual del control de radi del formulari
function llegirRadiDelFormulari() {
    const input = document.querySelector("#input-radi");
    if (!input) return radiCercaKm;
    return normalitzarRadiKm(input.value);
}

// Actualitza l'estat de radi. Només actua si ja hi ha una ubicació aplicada prèviament
function sincronitzarUbicacioActiva() {
    if (!ubicacioAplicada) return;
    radiCercaKm = actualitzarRadiUI(llegirRadiDelFormulari());
    actualitzarInfoUbicacio(codiPostalAplicat);
}

// Mostra el pas de tria de servei. Inicialment, està ocult, per no confondre a l'usuari sobre els passos que realitzem
function mostrarPasTriarServei() {
    document.querySelector("#pas-triar-servei").classList.remove("hidden");
}

// Actualitza el bloc que indica el codi postal i el radi
function actualitzarInfoUbicacio(cp) {
    const wrap = document.querySelector("#codi-aplicat-wrap");
    const info = document.querySelector("#codi-aplicat-info");
    if (wrap) wrap.classList.remove("hidden");
    if (info) info.innerHTML = `Cerca activa prop de <strong>${escapeHtml(cp)}</strong> en un radi de <strong>${radiCercaKm} km</strong>.`;
}

// Afegeix la classe 'is-selected' al botó de la categoria clicada i la treu de la resta
function marcarServeiPrincipal(categoria) {
    document.querySelectorAll(".category-tile-btn").forEach(btn => {
        btn.classList.toggle("is-selected", btn.dataset.cat === categoria);
    });
}

// Afegeix la classe 'active' al botó de subcategoria seleccionat i la treu de la resta
function marcarSubcategoriaActiva(sub) {
    document.querySelectorAll("#subcategories-nav .filter-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.sub === sub);
    });
}

// Construeix dinàmicament els botons de subcategoria
function renderitzarSubcategories(categoria) {
    const nav   = document.querySelector("#subcategories-nav");
    const intro = document.querySelector("#subcategories-intro");
    const llista = subcategoria[categoria] || [];

    intro.textContent = `Has triat ${noms_categoria[categoria]}. Ara concreta què necessites:`;
    nav.innerHTML = "";

    llista.forEach(item => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filter-btn";
        btn.dataset.sub = item.id;   // Emmagatzema l'id per identificar-lo al clic
        btn.textContent = item.label;
        btn.addEventListener("click", () => seleccionarSubcategoria(item.id));
        nav.appendChild(btn);
    });
}

// Construeix l'URL de resultats amb els paràmetres actuals i redirigeix l'usuari a la pàgina de resultats-serveis.html amb els resultats.
// Si la subcategoria és 'tots' no s'afegeix per mantenir URLs netes
function redirigirAResultats(categoria, sub) {
    const params = new URLSearchParams({
        cp: codiPostalAplicat,
        radi: radiCercaKm,
        categoria
    });
    if (sub && sub !== "tots") params.set("sub", sub);
    window.location.href = `resultats-serveis.html?${params.toString()}`;
}

function seleccionarServeiPrincipal(categoria) {
    if (!ubicacioAplicada) {
        document.querySelector("#error-cp").textContent =
            "Primer introdueix el codi postal i clica el botó.";
        return;
    }

    document.querySelector("#error-cp").textContent = "";
    categoriaSeleccionada = categoria;
    subcategoriaSeleccionada = null;
    marcarServeiPrincipal(categoria);

    document.querySelector("#pas-subcategories").classList.remove("is-open");

    if (categories_amb_subcategories.includes(categoria)) {
        renderitzarSubcategories(categoria);
        document.querySelector("#pas-subcategories").classList.add("is-open");
        return;
    }

    redirigirAResultats(categoria, "tots");
}

// Gestiona el clic sobre un botó de subcategoria i redirigeix als resultats
function seleccionarSubcategoria(sub) {
    if (!categoriaSeleccionada) return;
    subcategoriaSeleccionada = sub;
    marcarSubcategoriaActiva(sub);
    redirigirAResultats(categoriaSeleccionada, sub);
}

/* Aplica una ubicació (CP + radi): Desa les coordenades i marca l'estat com a "aplicat"
 * Si ja hi havia una categoria triada (cas: tornada de resultats), restaura l'estat visual
*/
async function aplicarUbicacio(cp, radiKm) {
    localitzacioActual = await geocodarCP(cp);
    codiPostalAplicat = cp;
    radiCercaKm = normalitzarRadiKm(radiKm);
    ubicacioAplicada = true;

    const inputCp = document.querySelector("#input-codi");
    if (inputCp) inputCp.value = cp;
    actualitzarRadiUI(radiCercaKm);

    actualitzarInfoUbicacio(cp);
    mostrarPasTriarServei();

    // Si l'usuari havia triat categoria prèviament, restaurem la selecció visual sense redirigir de nou
    if (categoriaSeleccionada) {
        marcarServeiPrincipal(categoriaSeleccionada);
        if (categories_amb_subcategories.includes(categoriaSeleccionada)) {
            renderitzarSubcategories(categoriaSeleccionada);
            document.querySelector("#pas-subcategories").classList.add("is-open");
            if (subcategoriaSeleccionada) {
                marcarSubcategoriaActiva(subcategoriaSeleccionada);
            }
        }
    }
}

// Consultem la sessió PHP per personalitzar el formulari (usuari registrat), i restaurem l'estat si venim de resultats-serveis.html via URL paràmetres
async function init() {  
    const params       = new URLSearchParams(window.location.search);
    const categoriaUrl = params.get("categoria");
    const subUrl       = params.get("sub");
    const cpUrl        = params.get("cp");
    const radiUrl      = params.get("radi");

    document.querySelectorAll(".category-tile-btn").forEach(btn => {
        btn.addEventListener("click", () => seleccionarServeiPrincipal(btn.dataset.cat));
    });

    document.querySelector("#btn-codi").addEventListener("click", async () => {
        const cp     = document.querySelector("#input-codi").value.trim();
        const radiKm = llegirRadiDelFormulari();
        const errorEl = document.querySelector("#error-cp");

        if (!/^\d{5}$/.test(cp)) {
            errorEl.textContent = "Introdueix un codi postal vàlid de 5 dígits.";
            return;
        }
        errorEl.textContent = "";

        try {
            await aplicarUbicacio(cp, radiKm);
        } catch {
            errorEl.textContent = "No s'ha trobat el codi postal. Prova'n un altre.";
        }
    });

    // Permet confirmar el codi postal prement Enter al camp de text
    document.querySelector("#input-codi").addEventListener("keydown", e => {
        if (e.key === "Enter") document.querySelector("#btn-codi").click();
    });

    const inputRadi = document.querySelector("#input-radi");
    if (inputRadi) {
        inputRadi.addEventListener("input", () => {
            actualitzarRadiUI(inputRadi.value);
            if (ubicacioAplicada) sincronitzarUbicacioActiva();
        });
    }

    // Es personalitza les dades de l'usuari que ha iniciat la sessió. Aquí fem la crida a l'arxiu estat-usuari.php per extreure la informació necessària.
    try {
        const r = await fetch("../scripts/php/estat-usuari.php");
        const sessio = await r.json();

        if (sessio.logat) {
            if (sessio.codi_postal && !cpUrl) {
                document.querySelector("#input-codi").value = sessio.codi_postal;
            }
            if (sessio.radi != null && !radiUrl) {
                radiCercaKm = actualitzarRadiUI(sessio.radi);
            }

            document.querySelector("#btn-codi").textContent = "Cercar";

            // Si l'usuari té interessos guardats, només es mostrarà els interessos indicats
            if (sessio.interessos?.length) {
                const slugs = sessio.interessos.map(id => id_categoria[id]).filter(Boolean);
                document.querySelectorAll(".category-tile-btn").forEach(btn => {
                    btn.hidden = !slugs.includes(btn.dataset.cat);
                });
            }
        }
    } catch (e) {
        console.error("Error comprovant sessió:", e);
    }

    // Si l'URL demana la categoria, gestions o acompanyament ho redirigim a la pàgina ajudes-recursos.html
    if (categoriaUrl === "gestions" || categoriaUrl === "acompanyament") {
        window.location.replace(`ajudes-recursos.html?categoria=${categoriaUrl}`);
        return;
    }

    // Quan clickem canviar de cerca, restaurem els valors
    if (categoriaUrl) {
        categoriaSeleccionada = categoriaUrl;
        if (subUrl) subcategoriaSeleccionada = subUrl;
    }

    if (cpUrl) {
        const radiKm = radiUrl ? normalitzarRadiKm(radiUrl) : 10;
        try {
            await aplicarUbicacio(cpUrl, radiKm);
        } catch {
            // l'usuari pot reintroduir el CP manualment
        }
    }
}

document.addEventListener("DOMContentLoaded", init);
