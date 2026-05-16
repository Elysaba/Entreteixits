<?php
session_start();
header('Content-Type: application/json');

/* Cridem a la taula creada, i que les credencials estàn en l'arxiu config.php.
 * En aquest cas només mirem la taula users i cerquem els camps que necessitem del usuari que són codi postal + radi + interessos */

if (!empty($_SESSION['id_user'])) {
    require_once __DIR__ . '/../config.php';

    $stmt = $conn->prepare("SELECT codi_postal, radi_localitzacio FROM users WHERE id_user = ?");
    $stmt->bind_param("i", $_SESSION['id_user']);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();

    $stmt2 = $conn->prepare("SELECT id_interest FROM users_interests WHERE id_usuario = ?");
    $stmt2->bind_param("i", $_SESSION['id_user']);
    $stmt2->execute();
    $res = $stmt2->get_result();
    $interessos = [];
    while ($row = $res->fetch_assoc()) {
        $interessos[] = (int) $row['id_interest'];
    }

    echo json_encode([
        'logat'       => true,
        'nom'         => $_SESSION['nom'],
        'email'       => $_SESSION['email'] ?? null,
        'codi_postal' => $fila['codi_postal'] ?? null,
        'radi'        => isset($fila['radi_localitzacio']) ? (int) $fila['radi_localitzacio'] : null,
        'interessos'  => $interessos
    ]);
} else {
    echo json_encode(['logat' => false]);
}
