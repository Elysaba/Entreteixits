<?php
/* En la part de l'usuari es pot veure tots els serveis que estan guardats a la taula
favorties de la nostra base de dades, on tenim guardat la relació entre usuari i serveis.
* Per aquest motiu necessitem retornar aquests valors, i això és el que fa aquest PHP
 */

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

$stmt = $conn->prepare("
    SELECT f.id_services AS id_extern, s.nom_servei, s.categoria, '' AS adreca, 'bbdd' AS font
    FROM favorites f
    JOIN services s ON s.id_services = f.id_services
    WHERE f.id_user = ?
");
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
