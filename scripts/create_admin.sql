-- Создание админ пользователя
-- Email: admin@coffee.com
-- Пароль: admin123
INSERT INTO users (email, password, first_name, last_name, role, is_active)
VALUES ('admin@coffee.com', '$2b$10$sLBzpTHEx6GiLNIYaqJ/.Oh2BvarSaGQSJJasnrAhXuzc/ZqAQ.Yi', 'Admin', 'User', 'admin', true)
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  role = VALUES(role),
  is_active = VALUES(is_active);

-- Проверка созданного пользователя
SELECT id, email, first_name, last_name, role, is_active, created_at
FROM users
WHERE email = 'admin@coffee.com';

