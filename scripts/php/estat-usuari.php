<?php
session_start();
header('Content-Type: application/json');

if (!empty($_SESSION['id_user'])) {
    require_once __DIR__ . '/../config.php';
    $stmt = $conn->prepare("SELECT codi_postal FROM users WHERE id_user = ?");
    $stmt->bind_param("i", $_SESSION['id_user']);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();

    echo json_encode([
        'logat'       => true,
        'nom'         => $_SESSION['nom'],
        'email'       => $_SESSION['email'] ?? null,
        'codi_postal' => $fila['codi_postal'] ?? null
    ]);
} else {
    echo json_encode(['logat' => false]);
}
