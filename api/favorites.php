<?php
require 'db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// Получить user_id: сначала по id, затем по email (для старых сессий)
function resolveUserId($pdo, $userId, $email) {
    if ($userId > 0) return (int)$userId;
    if (!$email) return 0;
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([trim($email)]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? (int)$row['id'] : 0;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $uid = resolveUserId($pdo, (int)($_GET['user_id'] ?? 0), $_GET['email'] ?? '');
    if (!$uid) { echo json_encode([]); exit; }
    $stmt = $pdo->prepare("SELECT tour_id FROM favorites WHERE user_id = ?");
    $stmt->execute([$uid]);
    echo json_encode(array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN)));
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$uid  = resolveUserId($pdo, (int)($data['user_id'] ?? 0), $data['email'] ?? '');

if (!$uid) {
    echo json_encode(['success' => false, 'message' => 'Пользователь не найден. Попробуйте войти заново.']);
    exit;
}

if ($method === 'POST') {
    $tourId = (int)($data['tour_id'] ?? 0);
    if (!$tourId) { echo json_encode(['success' => false, 'message' => 'tour_id не указан']); exit; }
    $pdo->prepare("INSERT IGNORE INTO favorites (user_id, tour_id) VALUES (?, ?)")->execute([$uid, $tourId]);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    $tourId = (int)($data['tour_id'] ?? 0);
    if (!$tourId) { echo json_encode(['success' => false, 'message' => 'tour_id не указан']); exit; }
    $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND tour_id = ?")->execute([$uid, $tourId]);
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Неизвестный метод']);
