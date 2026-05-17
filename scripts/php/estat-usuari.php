<?php
/* Aquest php el que fem és una crida a la nostra base de dades, creada a phpMyAdmin, i extraiem les següents informacions
   que necessitem pel nostre projecte.
 *   -  Si l'usuari ha iniciada sessió, i si ha començat sessió:
 *       - Extreure la informació: nom, email. Dades bàsiques de la sessió
 *       - Extreure altres informacions com: codi_postal, radi, i interessos. Per pre-emplenar el formulari de cerca
 */
session_start();
header('Content-Type: application/json');

if (!empty($_SESSION['id_user'])) {
    require_once __DIR__ . '/../config.php'; // En l'arxiu config tenim la configuració de la crida a la nostra Base de dades

    // Recuperem codi postal i radi de la taula 'users'
    $stmt = $conn->prepare("SELECT codi_postal, radi_localitzacio FROM users WHERE id_user = ?");
    $stmt->bind_param("i", $_SESSION['id_user']);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();

    // Recuperem les categories d'interès de la taula 'users_interests'
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
