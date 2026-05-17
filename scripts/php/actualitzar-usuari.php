<?php
/* L'usuari pot modificar les seves dades des del seu perfil, per tant, la informació que
modifiqui des del usuar.html, via POST l'hem d'actualitzar a la nostra taula
 */

session_start();

// Redirigim al login si l'usuari no està autenticat
if (empty($_SESSION['id_user'])) {
    header('Location: ../../public/login.html');
    exit;
}
require_once '../config.php';

$id_user     = $_SESSION['id_user'];
$nom         = trim($_POST['nom'] ?? '');
$idioma      = $_POST['idioma'] ?? 'ca';
$cp          = trim($_POST['cp'] ?? '');
$radi        = (int)($_POST['radi_localitzacio'] ?? 10);
$interessos  = $_POST['interessos'] ?? []; // Array d'IDs de categories seleccionades

// Actualita els camps bàsics de l'usuari a la taula USERS
$stmt = $conn->prepare("UPDATE users SET nom=?, idioma=?, codi_postal=?, radi_localitzacio=? WHERE id_user=?");
$stmt->bind_param("sssii", $nom, $idioma, $cp, $radi, $id_user);
$stmt->execute();
$stmt->close();

// Substitueix els interessos: primer esborrem els antics, després inserim els nous
$stmt2 = $conn->prepare("DELETE FROM users_interests WHERE id_usuario=?");
$stmt2->bind_param("i", $id_user);
$stmt2->execute();
$stmt2->close();

if (!empty($interessos)) {
    $stmt3 = $conn->prepare("INSERT INTO users_interests (id_usuario, id_interest) VALUES (?, ?)");
    foreach ($interessos as $id_interest) {
        $id_interest = (int)$id_interest;
        $stmt3->bind_param("ii", $id_user, $id_interest);
        $stmt3->execute();
    }
    $stmt3->close();
}

$_SESSION['nom'] = $nom;

header('Location: ../../public/usuari.html');
exit;
