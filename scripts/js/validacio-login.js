/* Validació del formulari d'inici de sessió.
 * El formulari envia les dades al servidor (login.php) via POST.
 * Es valida els camps i, si tot és correcte, inicia sessió. */

// Mostra els errors retornats pel servidor via query param
const errorParam = new URLSearchParams(window.location.search).get("error");
if (errorParam) {
    const missatges = {
        wrong_password: { span: "#error-password", text: "La contrasenya no és correcta." },
        user_not_found: { span: "#error-email", text: "No existeix cap compte amb aquest correu." },
        invalid_data:   { span: "#error-email", text: "Les dades introduïdes no són vàlides." }
    };
    const missatge = missatges[errorParam];
    if (missatge) {
        document.querySelector(missatge.span).textContent = missatge.text;
    }
}

const formulariLogin = document.querySelector("form");

formulariLogin.addEventListener("submit", (event) => {
    const emailText = document.querySelector("#email").value.trim();
    const passwordText = document.querySelector("#password").value;

    // Netejem els missatges d'error anteriors abans de tornar a validar/
    document.querySelector("#error-email").textContent = "";
    document.querySelector("#error-password").textContent = "";

    // Validem els dos camps
    const emailValid = validarEmail(emailText);
    const passwordValid = validarPassword(passwordText);

    if (!emailValid || !passwordValid) {
        event.preventDefault();
    }
});

// Comprova que el correu electrònic tingui un format vàlid 
function validarEmail(email) {
    const spanError = document.querySelector("#error-email");

    if (email === null || email.length === 0) {
        spanError.textContent = "Aquest camp és obligatori. Escriu el teu correu electrònic.";
        return false;
    }

    const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!pattern.test(email)) {
        spanError.textContent = "El correu electrònic no és vàlid.";
        return false;
    }

    return true;
}

// Comprova que la contrasenya no estigui buida i tingui el mínim de caràcters 
function validarPassword(password) {
    const spanError = document.querySelector("#error-password");

    if (password === null || password.length === 0) {
        spanError.textContent = "Aquest camp és obligatori. Escriu la teva contrasenya.";
        return false;
    }

    if (password.length < 8) {
        spanError.textContent = "La contrasenya ha de tenir mínim 8 caràcters.";
        return false;
    }

    return true;
}
