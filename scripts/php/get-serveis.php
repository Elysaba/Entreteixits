<?php
/* Retorna els serveis de la taula 'services' filtrats per categoria (gestions o acompanyament). */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';

$categoria = $_GET['categoria'] ?? '';
$mapaCategories = ['gestions' => 4, 'acompanyament' => 5];

if (!isset($mapaCategories[$categoria])) {
    echo json_encode(['error' => 'Categoria no vàlida']);
    exit;
}

$id_interests = $mapaCategories[$categoria];

$stmt = $conn->prepare(
    "SELECT id_services, nom_servei AS nom, descripcio, web FROM services WHERE id_interests = ? ORDER BY nom_servei"
);
if (!$stmt) {
    echo json_encode(['error' => $conn->error]);
    exit;
}
$stmt->bind_param('i', $id_interests);
$stmt->execute();
$resultat = $stmt->get_result();

$serveis = [];
while ($fila = $resultat->fetch_assoc()) {
    $serveis[] = $fila;
}

echo json_encode($serveis);
