-- ============================================================
-- DreamRoute — миграция базы данных
-- Запустить один раз в phpMyAdmin или через mysql
-- ============================================================

-- 1. Добавить поле is_hidden в таблицу tours
ALTER TABLE `tours`
    ADD COLUMN `is_hidden` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '0 = публичный, 1 = скрыт из публичного каталога';

-- 2. Создать таблицу избранного
CREATE TABLE IF NOT EXISTS `favorites` (
    `id`      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `tour_id` INT UNSIGNED NOT NULL,
    `added_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_tour` (`user_id`, `tour_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Вернуть user_id при логине — нужно, чтобы таблица users имела поле id
-- (обычно уже есть). Если нет — раскомментировать:
-- ALTER TABLE `users` ADD COLUMN `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;
