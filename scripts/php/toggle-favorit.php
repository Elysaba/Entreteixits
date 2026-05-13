<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

if ($conn->connect_error) {
    echo json_encode(['ok' => false, 'error' => 'db_connection']);
    exit;
}

if (empty($_SESSION['id_user'])) {
    echo json_encode(['ok' => false, 'error' => 'no_auth']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$id_user    = (int)$_SESSION['id_user'];
$nom_servei = trim($data['nom_servei'] ?? '');
$categoria  = trim($data['categoria']  ?? '');
$font       = trim($data['font']       ?? '');
$id_extern  = trim($data['id_extern']  ?? '');
$adreca     = trim($data['adreca']     ?? '');

if (!$nom_servei || !$font || !$id_extern) {
    echo json_encode(['ok' => false, 'error' => 'dades_incompletes']);
    exit;
}

// Comprovar si ja existeix
$stmt = $conn->prepare("SELECT id FROM favorits WHERE id_user = ? AND font = ? AND id_extern = ?");
if (!$stmt) {
    echo json_encode(['ok' => false, 'error' => 'db_error: ' . $conn->error]);
    exit;
}
$stmt->bind_param('iss', $id_user, $font, $id_extern);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    $stmt->close();
    $del = $conn->prepare("DELETE FROM favorits WHERE id_user = ? AND font = ? AND id_extern = ?");
    $del->bind_param('iss', $id_user, $font, $id_extern);
    $del->execute();
    echo json_encode(['ok' => true, 'estat' => 'eliminat']);
} else {
    $stmt->close();
    $ins = $conn->prepare(
        "INSERT INTO favorits (id_user, nom_servei, categoria, font, id_extern, adreca) VALUES (?, ?, ?, ?, ?, ?)"
    );
    $ins->bind_param('isssss', $id_user, $nom_servei, $categoria, $font, $id_extern, $adreca);
    $ins->execute();
    echo json_encode(['ok' => true, 'estat' => 'afegit']);
}
