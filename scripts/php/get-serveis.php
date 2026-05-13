<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config.php';

$categoria = $_GET['categoria'] ?? '';
$categoriesPermeses = ['gestions', 'acompanyament'];

if (!in_array($categoria, $categoriesPermeses)) {
    echo json_encode(['error' => 'Categoria no vàlida']);
    exit;
}

$stmt = $conn->prepare(
    "SELECT id, nom, descripcio, preu, telefon, web FROM serveis WHERE categoria = ? AND actiu = 1 ORDER BY nom"
);
$stmt->bind_param('s', $categoria);
$stmt->execute();
$resultat = $stmt->get_result();

$serveis = [];
while ($fila = $resultat->fetch_assoc()) {
    $serveis[] = $fila;
}

echo json_encode($serveis);
