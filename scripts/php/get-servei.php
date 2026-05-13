<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

$id = (int)($_GET['id'] ?? 0);
if (!$id) { echo json_encode(null); exit; }

$stmt = $conn->prepare("SELECT id, nom, descripcio, preu, telefon, web FROM serveis WHERE id = ? AND actiu = 1");
$stmt->bind_param('i', $id);
$stmt->execute();
$fila = $stmt->get_result()->fetch_assoc();

echo json_encode($fila);
