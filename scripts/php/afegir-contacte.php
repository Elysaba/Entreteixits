<?php

/* Aquest PHP el vam preparar a l'inici pensant amb els serveis donats d'alta a la nostra base de dades.
 * Com que al final només simulem la part de contacar amb els serveis de Google API, ho guardem en LocalStorage
 * Però tenim una part de la segona fase preparada
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

if (empty($_SESSION['id_user'])) {
    echo json_encode(['ok' => false, 'error' => 'no_auth']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$id_user  = (int)$_SESSION['id_user'];
$font     = trim($data['font']      ?? '');
$id_extern = trim($data['id_extern'] ?? '');
$missatge = trim($data['missatge']  ?? '');

if (!$missatge) {
    echo json_encode(['ok' => false, 'error' => 'dades_incompletes']);
    exit;
}

// id_services només existeix per als serveis de la nostra BBDD
if ($font === 'bbdd' && $id_extern !== '') {
    $id_services = (int)$id_extern;
    $stmt = $conn->prepare(
        "INSERT INTO contacted (id_user, id_services, missatge) VALUES (?, ?, ?)"
    );
    $stmt->bind_param('iis', $id_user, $id_services, $missatge);
} else {
    $stmt = $conn->prepare(
        "INSERT INTO contacted (id_user, id_services, missatge) VALUES (?, NULL, ?)"
    );
    $stmt->bind_param('is', $id_user, $missatge);
}

if ($stmt->execute()) {
    echo json_encode(['ok' => true]);
} else {
    echo json_encode(['ok' => false, 'error' => 'db_error']);
}
