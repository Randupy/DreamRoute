<?php
require 'db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$method = $_SERVER['REQUEST_METHOD'];

// GET: список заказов
if ($method === 'GET') {
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $email  = isset($_GET['email'])  ? $_GET['email']  : null;

    if ($email && $status) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE user_email = ? AND status = ? ORDER BY created_at DESC");
        $stmt->execute([$email, $status]);
    } elseif ($email) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE user_email = ? ORDER BY created_at DESC");
        $stmt->execute([$email]);
    } elseif ($status) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC");
        $stmt->execute([$status]);
    } else {
        $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
    }
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($orders as &$o) {
        $o['options_selected'] = json_decode($o['options_selected'] ?? '[]');
    }
    echo json_encode($orders);
    exit;
}

// POST: создать заказ
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare(
        "INSERT INTO orders (user_email, user_name, tour_id, tour_name, base_price, final_price, options_selected, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'new')"
    );
    $stmt->execute([
        $data['user_email'] ?? '',
        $data['user_name']  ?? '',
        (int)($data['tour_id']   ?? 0),
        $data['tour_name'] ?? '',
        (int)($data['base_price']  ?? 0),
        (int)($data['final_price'] ?? 0),
        json_encode($data['options_selected'] ?? []),
    ]);
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    exit;
}

// PATCH: изменить статус заказа
if ($method === 'PATCH') {
    $data   = json_decode(file_get_contents('php://input'), true);
    $id     = (int)($data['id']     ?? 0);
    $status = $data['status'] ?? '';
    $allowed = ['new', 'processing', 'confirmed', 'cancelled'];
    if (!$id || !in_array($status, $allowed)) {
        echo json_encode(['success' => false, 'message' => 'Неверные параметры']); exit;
    }
    $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?")->execute([$status, $id]);
    echo json_encode(['success' => true]);
    exit;
}

// DELETE: удалить заказ
if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($data['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'ID не указан']); exit; }
    $pdo->prepare("DELETE FROM orders WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Неизвестный метод']);
