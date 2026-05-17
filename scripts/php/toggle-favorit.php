<?php
/* Aquest php el que pretén és gestionar els serveis de favorits dels usuaris.
 * Només afecta els serveis que tenim donats d'alta la nostra base de dades. Anirem guardant serveis i eliminant
 * serveis que l'usuari està registrat
 */

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

$data  = json_decode(file_get_contents('php://input'), true);
$id_user  = (int)$_SESSION['id_user'];
$id_services = (int)($data['id_services'] ?? 0);

if (!$id_services) {
    echo json_encode(['ok' => false, 'error' => 'dades_incompletes']);
    exit;
}

$stmt = $conn->prepare("SELECT id_services FROM favorites WHERE id_user = ? AND id_services = ?");
if (!$stmt) {
    echo json_encode(['ok' => false, 'error' => 'db_error: ' . $conn->error]);
    exit;
}
$stmt->bind_param('ii', $id_user, $id_services);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    $stmt->close();
    $del = $conn->prepare("DELETE FROM favorites WHERE id_user = ? AND id_services = ?");
    $del->bind_param('ii', $id_user, $id_services);
    $del->execute();
    echo json_encode(['ok' => true, 'estat' => 'eliminat']);
} else {
    $stmt->close();
    $ins = $conn->prepare("INSERT INTO favorites (id_user, id_services) VALUES (?, ?)");
    $ins->bind_param('ii', $id_user, $id_services);
    $ins->execute();
    echo json_encode(['ok' => true, 'estat' => 'afegit']);
}
