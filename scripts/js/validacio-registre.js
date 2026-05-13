/* Validació del formulari de registre - Entreteixits */

function validarNom(nom) {
    if (nom === null || nom.trim().length < 2) {
        alert('El nom ha de tenir com a mínim 2 caràcters.')
        return false
    }
    return true
}

function validarEmailRegistre(email) {
    const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!pattern.test(email)) {
        alert('El correu electrònic no és vàlid.')
        return false
    }
    return true
}

function validarPasswordRegistre(password) {
    const patternPass = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (password === null || password.length < 8) {
        alert('La contrasenya ha de contenir mínim 8 caràcters.')
        return false
    }
    if (!patternPass.test(password)) {
        alert('Revisa la contrasenya. Ha de contenir: lletres, números i caràcters especials.')
        return false
    }
    return true
}

function validarPrivacitat(checked) {
    if (!checked) {
        alert("Has d'acceptar les polítiques de privacitat.")
        return false
    }
    return true
}

function validarCodiPostal(cp) {
    const patternCodi = /^[0-9]{5}$/;
    if (!patternCodi.test(cp)) {
        alert('El Codi Postal ha de tenir exactament 5 dígits.')
        return false
    }
    return true
}

/* Pas 1 */
const formPas1 = document.querySelector('#form-registre-1')
if (formPas1) {
    formPas1.addEventListener('submit', (e) => {
        const nomText      = document.querySelector('#name').value
        const emailText    = document.querySelector('#email').value
        const passwordText = document.querySelector('#password').value
        const privChecked  = document.querySelector('input[name="privacitat"]').checked

        const nomValid  = validarNom(nomText)
        const mailValid = validarEmailRegistre(emailText)
        const passValid = validarPasswordRegistre(passwordText)
        const privValid = validarPrivacitat(privChecked)

        if (!nomValid || !mailValid || !passValid || !privValid) {
            e.preventDefault()
        }
    })
}

/* Pas 2 */
const formPas2 = document.querySelector('#form-registre-2')
if (formPas2) {
    formPas2.addEventListener('submit', (e) => {
        const cpText = document.querySelector('#cp').value

        if (!validarCodiPostal(cpText)) {
            e.preventDefault()
        }
    })
}
