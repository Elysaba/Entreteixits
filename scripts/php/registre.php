<?php
session_start();
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../../public/registre.html');
    exit;
}

$pas = (int)($_POST['pas'] ?? 0);

// ── PAS 1 ──────────────────────────────────────────
if ($pas === 1) {

    $nom      = trim($_POST['name'] ?? '');
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (strlen($nom) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
        header('Location: ../../public/registre.html?error=invalid_data');
        exit;
    }

    $stmt = $conn->prepare("SELECT id_user FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        header('Location: ../../public/registre.html?error=email_exists');
        exit;
    }
    $stmt->close();

    $_SESSION['reg_nom']      = $nom;
    $_SESSION['reg_email']    = $email;
    $_SESSION['reg_password'] = password_hash($password, PASSWORD_DEFAULT);

    header('Location: ../../public/registre-2.html');
    exit;
}

// ── PAS 2 ──────────────────────────────────────────
if ($pas === 2) {

    if (empty($_SESSION['reg_nom']) || empty($_SESSION['reg_email']) || empty($_SESSION['reg_password'])) {
        header('Location: ../../public/registre.html?error=session_expired');
        exit;
    }

    $cp         = trim($_POST['cp'] ?? '');
    $interessos = $_POST['interessos'] ?? [];

    if (!preg_match('/^\d{5}$/', $cp)) {
        header('Location: ../../public/registre-2.html?error=cp_invalid');
        exit;
    }

    $nom      = $_SESSION['reg_nom'];
    $email    = $_SESSION['reg_email'];
    $password = $_SESSION['reg_password'];
    $num      = count($interessos);

    $stmt = $conn->prepare("INSERT INTO users (nom, email, password, codi_postal, num_serveis_interes) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssi", $nom, $email, $password, $cp, $num);

if (!$stmt->execute()) {
    header('Location: ../../public/registre-2.html?error=db_error');
    exit;
}




    $id_user = $stmt->insert_id;
    $stmt->close();

    if (!empty($interessos)) {
        $stmt2 = $conn->prepare("INSERT INTO users_interests (id_usuario, id_interest) VALUES (?, ?)");
        foreach ($interessos as $id_interest) {
            $id_interest = (int)$id_interest;
            $stmt2->bind_param("ii", $id_user, $id_interest);
            $stmt2->execute();
        }
        $stmt2->close();
    }

    unset($_SESSION['reg_nom'], $_SESSION['reg_email'], $_SESSION['reg_password']);

    header('Location: ../../public/login.html');
    exit;
}
?>

