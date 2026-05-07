<?php
require 'db.php';
$data = json_decode(file_get_contents('php://input'), true);

$stmt = $pdo->prepare("INSERT INTO feedback (user_email, message) VALUES (?, ?)");
$stmt->execute([$data['email'], $data['message']]);

echo json_encode(['success' => true]);
?>