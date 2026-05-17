<?php
/* En la part de contactes es pot veure tots els serveis que estan guardats a la taula
contactes de la nostra base de dades, on tenim guardat la relació entre usuari, serveis i missatges.
* Per aquest motiu necessitem retornar aquests valors, i això és el que fa aquest PHP.
* Actualment aquest PHP no és vàlid, ho tenim preparat per una fase 2
 */

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
    "SELECT s.nom_servei, s.categoria, 'bbdd' AS font, '' AS adreca, c.missatge, c.data_contacte
     FROM contacted c
     JOIN services s ON s.id_services = c.id_services
     WHERE c.id_user = ? ORDER BY c.data_contacte DESC"
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
