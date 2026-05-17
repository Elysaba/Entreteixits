/* Validació del formulari d'inici de sessió.
 * El formulari envia les dades al servidor (login.php) via POST.
 * Es valida els camps i, si tot és correcte, inicia sessió. */

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
