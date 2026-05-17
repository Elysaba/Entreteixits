<?php
/**
 * get-servei.php — Detall d'un servei de la BBDD pròpia (endpoint JSON)
 *
 * Cridat per fitxa-servei.html quan el servei és de font='bbdd'
 * (Acompanyament o Gestions) per mostrar el detall complet.
 *
 * Paràmetre GET:
 *   id → ID numèric del servei a la taula 'services'
 *
 * Retorna un objecte JSON amb tots els camps del servei,
 * o null si l'ID no existeix o no és vàlid.
 *
 * NOTA: A diferència dels serveis de Google (llar, activitats, desplaçaments),
 * aquests no tenen filtre d'ubicació perquè són serveis generals, no locals.
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

$id = (int)($_GET['id'] ?? 0);

// Si no hi ha ID vàlid, retornem null sense consultar la BBDD
if (!$id) { echo json_encode(null); exit; }

// Recuperem tots els camps del servei per mostrar-los a la fitxa de detall
$stmt = $conn->prepare("SELECT id_services AS id, nom_servei, descripcio, contacte, font, web FROM services WHERE id_services = ?");
if (!$stmt) {
    // Si prepare() falla (p.ex. nom de columna incorrecte), mostrem l'error real
    echo json_encode(['error' => $conn->error]);
    exit;
}
$stmt->bind_param('i', $id);
$stmt->execute();
$fila = $stmt->get_result()->fetch_assoc();

echo json_encode($fila);
