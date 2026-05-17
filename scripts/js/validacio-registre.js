// Validació del formulari de registre.

// Mostra els errors retornats pel servidor via query param
const errorParam = new URLSearchParams(window.location.search).get("error");
if (errorParam) {
    const missatges = {
        email_exists:    { span: "#error-email",    text: "Aquest correu ja té un compte. Inicia sessió o utilitza un altre correu." },
        invalid_data:    { span: "#error-email",    text: "Les dades introduïdes no són vàlides." },
        session_expired: { span: "#error-nom",      text: "La sessió ha caducat. Torna a omplir el formulari." },
        cp_invalid:      { span: "#error-cp",       text: "El codi postal no és vàlid." },
        db_error:        { span: "#error-cp",       text: "S'ha produït un error en crear el compte. Torna-ho a intentar." }
    };
    const missatge = missatges[errorParam];
    if (missatge) {
        const span = document.querySelector(missatge.span);
        if (span) span.textContent = missatge.text;
    }
}

// Validació del primer pas del formulari
const formPas1 = document.querySelector("#form-registre-1");

if (formPas1) {
    formPas1.addEventListener("submit", (event) => {
        const nomText      = document.querySelector("#name").value.trim();
        const emailText    = document.querySelector("#email").value.trim();
        const passwordText = document.querySelector("#password").value;
        const privChecked  = document.querySelector('input[name="privacitat"]').checked;

        /* Netejem els missatges d'error anteriors abans de tornar a validar */
        document.querySelector("#error-nom").textContent       = "";
        document.querySelector("#error-email").textContent     = "";
        document.querySelector("#error-password").textContent  = "";
        document.querySelector("#error-privacitat").textContent = "";

        /* Validem tots els camps i aturem l'enviament si n'hi ha algun amb error */
        const nomValid  = validarNom(nomText);
        const mailValid = validarEmail(emailText);
        const passValid = validarPassword(passwordText);
        const privValid = validarPrivacitat(privChecked);

        if (!nomValid || !mailValid || !passValid || !privValid) {
            event.preventDefault();
        }
    });
}

// Comprova que el nom tingui com a mínim 2 caràcters
function validarNom(nom) {
    const spanError = document.querySelector("#error-nom");

    if (nom === null || nom.length < 2) {
        spanError.textContent = "El nom ha de tenir com a mínim 2 caràcters.";
        return false;
    }

    return true;
}

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

// Comprova que la contrasenya tingui mínim 8 caràcters i contingui lletres, números i caràcters especials
function validarPassword(password) {
    const spanError = document.querySelector("#error-password");

    if (password === null || password.length === 0) {
        spanError.textContent = "Aquest camp és obligatori. Escriu una contrasenya.";
        return false;
    }

    if (password.length < 8) {
        spanError.textContent = "La contrasenya ha de tenir mínim 8 caràcters.";
        return false;
    }

    const patternPass = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!patternPass.test(password)) {
        spanError.textContent = "Revisa la contrasenya. Ha de contenir: lletres, números i caràcters especials.";
        return false;
    }

    return true;
}

// Comprova que l'usuari hagi acceptat les polítiques de privacitat
function validarPrivacitat(checked) {
    const spanError = document.querySelector("#error-privacitat");

    if (!checked) {
        spanError.textContent = "Has d'acceptar les polítiques de privacitat per continuar.";
        return false;
    }

    return true;
}


// Validació del segon pas del formualri
const formPas2 = document.querySelector("#form-registre-2");

if (formPas2) {
    formPas2.addEventListener("submit", (event) => {
        const cpText = document.querySelector("#cp").value.trim();

        // Netejem el missatge d'error anterior abans de tornar a validar
        document.querySelector("#error-cp").textContent = "";

        // Validem el codi postal i aturem l'enviament si no és vàlid
        if (!validarCodiPostal(cpText)) {
            event.preventDefault();
        }
    });
}


// Comprova que el codi postal tingui exactament 5 dígits numèrics
function validarCodiPostal(cp) {
    const spanError = document.querySelector("#error-cp");

    if (cp === null || cp.length === 0) {
        spanError.textContent = "Aquest camp és obligatori. Escriu el teu codi postal.";
        return false;
    }

    const patternCodi = /^[0-9]{5}$/;
    if (!patternCodi.test(cp)) {
        spanError.textContent = "El codi postal ha de tenir exactament 5 dígits.";
        return false;
    }

    return true;
}
