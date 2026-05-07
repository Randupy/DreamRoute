<?php
$host = 'localhost';
$db   = 'cv668997_dreamroute';
$user = 'cv668997_dreamroute';
$pass = 'Re17112005'; // В XAMPP пароль обычно пустой, в OpenServer - root

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(['error' => 'Ошибка подключения: ' . $e->getMessage()]));
}

// ── Автоматическая миграция ─────────────────────────────────────────────────
// Добавляет is_hidden в tours и создаёт таблицу favorites, если их ещё нет.
// Безопасно запускать при каждом запросе — IF NOT EXISTS / проверка колонки.

try {
    // 1. Колонка is_hidden в таблице tours
    $col = $pdo->query("SHOW COLUMNS FROM `tours` LIKE 'is_hidden'")->rowCount();
    if ($col === 0) {
        $pdo->exec("ALTER TABLE `tours` ADD COLUMN `is_hidden` TINYINT(1) NOT NULL DEFAULT 0");
    }

    // 2. Таблица favorites
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `favorites` (
            `id`       INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `user_id`  INT UNSIGNED NOT NULL,
            `tour_id`  INT UNSIGNED NOT NULL,
            `added_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uq_user_tour` (`user_id`, `tour_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // 3. Таблица обратной связи (контактная форма)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `feedback` (
            `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `user_email` VARCHAR(255) NOT NULL DEFAULT '',
            `message`    TEXT NOT NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // 4. Таблица заказов
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `orders` (
            `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `user_email`       VARCHAR(255) NOT NULL DEFAULT '',
            `user_name`        VARCHAR(255) NOT NULL DEFAULT '',
            `tour_id`          INT UNSIGNED NOT NULL DEFAULT 0,
            `tour_name`        VARCHAR(255) NOT NULL DEFAULT '',
            `base_price`       INT UNSIGNED NOT NULL DEFAULT 0,
            `final_price`      INT UNSIGNED NOT NULL DEFAULT 0,
            `options_selected` TEXT,
            `status`           ENUM('new','processing','confirmed','cancelled') NOT NULL DEFAULT 'new',
            `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
} catch (PDOException $e) {
    // Миграция не критична для работы сайта — молча логируем
    error_log('DreamRoute migration error: ' . $e->getMessage());
}
