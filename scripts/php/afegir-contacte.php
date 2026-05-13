<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

if (empty($_SESSION['id_user'])) {
    echo json_encode(['ok' => false, 'error' => 'no_auth']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$id_user       = (int)$_SESSION['id_user'];
$nom_contacte  = trim($data['nom_contacte']  ?? '');
$email_contacte= trim($data['email_contacte'] ?? '');
$nom_servei    = trim($data['nom_servei']    ?? '');
$categoria     = trim($data['categoria']     ?? '');
$font          = trim($data['font']          ?? '');
$id_extern     = trim($data['id_extern']     ?? '');
$adreca        = trim($data['adreca']        ?? '');
$missatge      = trim($data['missatge']      ?? '');

if (!$nom_contacte || !$email_contacte || !$nom_servei || !$missatge) {
    echo json_encode(['ok' => false, 'error' => 'dades_incompletes']);
    exit;
}

$stmt = $conn->prepare(
    "INSERT INTO contactes (id_user, nom_contacte, email_contacte, nom_servei, categoria, font, id_extern, adreca, missatge)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
$stmt->bind_param('issssssss', $id_user, $nom_contacte, $email_contacte, $nom_servei, $categoria, $font, $id_extern, $adreca, $missatge);

if ($stmt->execute()) {
    echo json_encode(['ok' => true]);
} else {
    echo json_encode(['ok' => false, 'error' => 'db_error']);
}
