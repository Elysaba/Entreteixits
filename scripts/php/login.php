<?php
/* Aquest PHP és necessari per poder comprovar que les dades que ens arriba via POST
estan a la taula de USERS de la nostra Base de dades.
 */

session_start();
require_once '../config.php';

// Només accepta POST — si algú accedeix per GET el tornem al formulari
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../../public/login.html');
    exit;
}

$email    = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

// Validació bàsica abans de consultar a la taula
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
    header('Location: ../../public/login.html?error=invalid_data');
    exit;
}

// Busqua l'usuari per email a la taula USERS
$stmt = $conn->prepare("SELECT id_user, nom, password FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();

// Si no hi ha cap usuari amb aquest email
if ($stmt->num_rows === 0) {
    $stmt->close();
    header('Location: ../../public/login.html?error=user_not_found');
    exit;
}

$stmt->bind_result($id_user, $nom, $hashed_password);
$stmt->fetch();
$stmt->close();

// Verifica la contrasenya contra el hash guardat a la BBDD
if (!password_verify($password, $hashed_password)) {
    header('Location: ../../public/login.html?error=wrong_password');
    exit;
}

// Login correcte
$_SESSION['id_user'] = $id_user;
$_SESSION['nom']     = $nom;
$_SESSION['email']   = $email;

header('Location: ../../public/index.html');
exit;
?>
