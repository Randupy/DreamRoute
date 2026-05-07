<?php
require 'db.php';
session_start();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'];
$pass  = $data['password'];

$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user && password_verify($pass, $user['password'])) {
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role']    = $user['role'];
    echo json_encode([
        'success' => true,
        'user' => [
            'id'    => (int)$user['id'],
            'email' => $user['email'],
            'role'  => $user['role']
        ]
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Неверный логин или пароль']);
}
