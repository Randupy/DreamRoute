<?php
/**
 * УТИЛИТА СБРОСА ПАРОЛЯ АДМИНИСТРАТОРА
 * 
 * Как использовать:
 *   Открыть в браузере: http://localhost/dreamroute/api/reset_admin.php
 * 
 * ВАЖНО: Удалить этот файл после использования!
 */
require 'db.php';

$newEmail    = 'admin@dreamroute.ru';
$newPassword = 'Admin1234!';
$newHash     = password_hash($newPassword, PASSWORD_DEFAULT);

// Проверяем, существует ли уже аккаунт admin
$stmt = $pdo->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
$stmt->execute();
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing) {
    // Сбрасываем пароль и email существующего админа
    $pdo->prepare("UPDATE users SET email = ?, password = ? WHERE id = ?")
        ->execute([$newEmail, $newHash, $existing['id']]);
    $action = "Обновлён существующий аккаунт администратора (ID: {$existing['id']})";
} else {
    // Создаём нового администратора
    $pdo->prepare("INSERT INTO users (email, password, role) VALUES (?, ?, 'admin')")
        ->execute([$newEmail, $newHash]);
    $action = "Создан новый аккаунт администратора (ID: " . $pdo->lastInsertId() . ")";
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Сброс администратора</title>
<style>
  body { font-family: sans-serif; max-width: 500px; margin: 60px auto; padding: 0 20px; }
  .box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; padding: 28px; }
  .box h2 { color: #15803d; margin-top: 0; }
  .creds { background: #fff; border: 1px solid #d1fae5; border-radius: 8px; padding: 16px; margin: 16px 0; }
  .creds p { margin: 6px 0; font-size: 1rem; }
  .creds strong { font-family: monospace; font-size: 1.1rem; color: #1e293b; }
  .warn { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 14px; color: #991b1b; font-size: .9rem; margin-top: 16px; }
</style>
</head>
<body>
<div class="box">
  <h2>✅ Готово!</h2>
  <p><?= htmlspecialchars($action) ?></p>
  <div class="creds">
    <p>Логин: <strong><?= htmlspecialchars($newEmail) ?></strong></p>
    <p>Пароль: <strong><?= htmlspecialchars($newPassword) ?></strong></p>
  </div>
  <p>Войдите на сайт с этими данными, затем смените пароль если нужно.</p>
  <div class="warn">
    ⚠️ <strong>Удалите этот файл сразу после использования!</strong><br>
    Путь: <code>api/reset_admin.php</code>
  </div>
</div>
</body>
</html>
