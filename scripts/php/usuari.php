<?php
// Recuperem les dades del Usuari guardats a la nostra taula de PhpMyAdmin
session_start();
header('Content-Type: application/json');

if (empty($_SESSION['id_user'])) {
    echo json_encode(['error' => 'no_session']);
    exit;
}

require_once '../config.php';

$id_user = $_SESSION['id_user'];

$stmt = $conn->prepare("SELECT nom, email, idioma, codi_postal, radi_localitzacio, num_serveis_interes, data_naixement FROM users WHERE id_user = ?");
$stmt->bind_param("i", $id_user);
$stmt->execute();
$stmt->bind_result($nom, $email, $idioma, $cp, $radi, $num_serveis, $data_naixement);
$stmt->fetch();
$stmt->close();

$stmt2 = $conn->prepare("SELECT id_interest FROM users_interests WHERE id_usuario = ?");
$stmt2->bind_param("i", $id_user);
$stmt2->execute();
$stmt2->bind_result($id_int);
$interessos = [];
while ($stmt2->fetch()) {
    $interessos[] = $id_int;
}
$stmt2->close();

echo json_encode([
    'nom'        => $nom,
    'email'      => $email,
    'idioma'     => $idioma,
    'cp'         => $cp,
    'radi'       => $radi,
    'num_serveis'    => $num_serveis,
    'data_naixement' => $data_naixement,
    'interessos'     => $interessos
]);
