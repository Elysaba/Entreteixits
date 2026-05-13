<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

if (empty($_SESSION['id_user'])) {
    echo json_encode([]);
    exit;
}

if ($conn->connect_error) {
    echo json_encode([]);
    exit;
}

$id_user = (int)$_SESSION['id_user'];
$stmt = $conn->prepare(
    "SELECT nom_servei, categoria, font, adreca, missatge, data_contacte
     FROM contactes WHERE id_user = ? ORDER BY data_contacte DESC"
);
if (!$stmt) {
    echo json_encode([]);
    exit;
}
$stmt->bind_param('i', $id_user);
$stmt->execute();
$resultat = $stmt->get_result();

$contactes = [];
while ($fila = $resultat->fetch_assoc()) {
    $contactes[] = $fila;
}

echo json_encode($contactes);
