<?php
require 'db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$method = $_SERVER['REQUEST_METHOD'];

// GET: список туров
if ($method === 'GET') {
    $isAdmin = isset($_GET['admin']) && $_GET['admin'] === '1';
    $sql     = $isAdmin
        ? "SELECT * FROM tours ORDER BY id DESC"
        : "SELECT * FROM tours WHERE is_hidden = 0 ORDER BY id DESC";
    $tours = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    foreach ($tours as &$tour) {
        $tour['includes']  = json_decode($tour['includes_json']);
        $tour['options']   = json_decode($tour['options_json']);
        $tour['is_hidden'] = (int)$tour['is_hidden'];
    }
    echo json_encode($tours);
    exit;
}

// POST: добавить тур
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare(
        "INSERT INTO tours (name, price, category, duration, image_url, description, includes_json, options_json, is_hidden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)"
    );
    $stmt->execute([
        $data['name'], $data['price'], $data['category'], $data['duration'],
        $data['img'],  $data['desc'],
        json_encode($data['includes']),
        json_encode($data['options'] ?? new stdClass()),
    ]);
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    exit;
}

// PUT: редактировать тур
if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($data['id'] ?? 0);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'ID не указан']); exit; }
    $stmt = $pdo->prepare(
        "UPDATE tours SET name=?, price=?, category=?, duration=?, image_url=?, description=?, includes_json=?, options_json=? WHERE id=?"
    );
    $stmt->execute([
        $data['name'], $data['price'], $data['category'], $data['duration'],
        $data['img'],  $data['desc'],
        json_encode($data['includes']),
        json_encode($data['options'] ?? new stdClass()),
        $id,
    ]);
    echo json_encode(['success' => true]);
    exit;
}

// PATCH: скрыть / показать тур
if ($method === 'PATCH') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($data['id'] ?? 0);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'ID не указан']); exit; }
    $pdo->prepare("UPDATE tours SET is_hidden = 1 - is_hidden WHERE id = ?")->execute([$id]);
    $row = $pdo->prepare("SELECT is_hidden FROM tours WHERE id = ?");
    $row->execute([$id]);
    $is_hidden = (int)$row->fetchColumn();
    echo json_encode(['success' => true, 'is_hidden' => $is_hidden]);
    exit;
}

// DELETE: удалить тур
if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($data['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'ID не указан']); exit; }
    $pdo->prepare("DELETE FROM favorites WHERE tour_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM tours WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Неизвестный метод']);
