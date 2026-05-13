<?php
session_start();

if (empty($_SESSION['id_user'])) {
    header('Location: ../../public/login.html');
    exit;
}

require_once '../config.php';

$id_user    = $_SESSION['id_user'];
$nom        = trim($_POST['nom'] ?? '');
$idioma     = $_POST['idioma'] ?? 'ca';
$cp         = trim($_POST['cp'] ?? '');
$radi       = (int)($_POST['radi_localitzacio'] ?? 10);
$num_serveis = (int)($_POST['num_serveis_interes'] ?? 1);
$interessos = $_POST['interessos'] ?? [];

// Actualitzem les dades de l'usuari
$stmt = $conn->prepare("UPDATE users SET nom=?, idioma=?, codi_postal=?, radi_localitzacio=?, num_serveis_interes=? WHERE id_user=?");
$stmt->bind_param("sssiii", $nom, $idioma, $cp, $radi, $num_serveis, $id_user);
$stmt->execute();
$stmt->close();

// Esborrem els interessos antics i inserim els nous
$stmt2 = $conn->prepare("DELETE FROM users_interests WHERE id_usuario=?");
$stmt2->bind_param("i", $id_user);
$stmt2->execute();
$stmt2->close();

if (!empty($interessos)) {
    $stmt3 = $conn->prepare("INSERT INTO users_interests (id_usuario, id_interest) VALUES (?, ?)");
    foreach ($interessos as $id_interest) {
        $id_interest = (int)$id_interest;
        $stmt3->bind_param("ii", $id_user, $id_interest);
        $stmt3->execute();
    }
    $stmt3->close();
}

// Actualitzem el nom a la sessió
$_SESSION['nom'] = $nom;

header('Location: ../../public/usuari.html');
exit;
