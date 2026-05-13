<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

if ($conn->connect_error) {
    echo json_encode(['error' => 'db_connection']);
    exit;
}

if (empty($_SESSION['id_user'])) {
    echo json_encode([]);
    exit;
}

$id_user = (int)$_SESSION['id_user'];
$stmt = $conn->prepare(
    "SELECT nom_servei, categoria, font, id_extern, adreca, data_afegit
     FROM favorits WHERE id_user = ? ORDER BY data_afegit DESC"
);
if (!$stmt) {
    echo json_encode(['error' => 'db_error: ' . $conn->error]);
    exit;
}
$stmt->bind_param('i', $id_user);
$stmt->execute();
$resultat = $stmt->get_result();

$favorits = [];
while ($fila = $resultat->fetch_assoc()) {
    $favorits[] = $fila;
}

echo json_encode($favorits);
