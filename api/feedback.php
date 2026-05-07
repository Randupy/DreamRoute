<?php
require 'db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$method = $_SERVER['REQUEST_METHOD'];

// GET: все сообщения
if ($method === 'GET') {
    $msgs = $pdo->query("SELECT * FROM feedback ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($msgs);
    exit;
}

// DELETE: удалить сообщение
if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($data['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'ID не указан']); exit; }
    $pdo->prepare("DELETE FROM feedback WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Неизвестный метод']);
