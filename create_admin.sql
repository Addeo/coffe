-- Создание админ пользователя
INSERT INTO users (email, password, first_name, last_name, role, is_active)
VALUES ('admin@coffee.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin', true)
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  role = VALUES(role),
  is_active = VALUES(is_active);

-- Проверка созданного пользователя
SELECT id, email, first_name, last_name, role, is_active, created_at
FROM users
WHERE email = 'admin@coffee.com';

