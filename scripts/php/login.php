<?php
session_start();
require_once '../config.php';

// Només acceptem POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../../public/login.html');
    exit;
}

$email    = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

// Validació bàsica de camps
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
    header('Location: ../../public/login.html?error=invalid_data');
    exit;
}

// Busquem l'usuari per email
$stmt = $conn->prepare("SELECT id_user, nom, password FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows === 0) {
    $stmt->close();
    header('Location: ../../public/login.html?error=user_not_found');
    exit;
}

$stmt->bind_result($id_user, $nom, $hashed_password);
$stmt->fetch();
$stmt->close();

if (!password_verify($password, $hashed_password)) {
    header('Location: ../../public/login.html?error=wrong_password');
    exit;
}

$_SESSION['id_user'] = $id_user;
$_SESSION['nom']     = $nom;
$_SESSION['email']   = $email;

header('Location: ../../public/index.html');
exit;
?>