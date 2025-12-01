-- ============================================
-- COMPREHENSIVE Production Data Seeding Script
-- Полное покрытие всех возможных сценариев
-- ============================================

-- Этот скрипт создает полный набор тестовых данных для демонстрации
-- всех возможностей системы статистики и расчетов

SET @current_month_start = DATE_FORMAT(NOW(), '%Y-%m-01');
SET @current_month_end = LAST_DAY(NOW());
SET @prev_month_start = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01');
SET @prev_month_end = LAST_DAY(DATE_SUB(NOW(), INTERVAL 1 MONTH));
SET @next_month_start = DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01');

-- ============================================
-- STEP 1: Создание тестовых пользователей и инженеров
-- ============================================

-- Создаем тестовых пользователей-инженеров
INSERT IGNORE INTO users (email, password, first_name, last_name, role, primary_role, is_active, created_at, updated_at)
VALUES 
('engineer1@test.com', '$2b$10$sLBzpTHEx6GiLNIYaqJ/.Oh2BvarSaGQSJJasnrAhXuzc/ZqAQ.Yi', 'Иван', 'Петров', 'user', 'user', 1, NOW(), NOW()),
('engineer2@test.com', '$2b$10$sLBzpTHEx6GiLNIYaqJ/.Oh2BvarSaGQSJJasnrAhXuzc/ZqAQ.Yi', 'Сергей', 'Иванов', 'user', 'user', 1, NOW(), NOW()),
('engineer3@test.com', '$2b$10$sLBzpTHEx6GiLNIYaqJ/.Oh2BvarSaGQSJJasnrAhXuzc/ZqAQ.Yi', 'Алексей', 'Сидоров', 'user', 'user', 1, NOW(), NOW()),
('engineer4@test.com', '$2b$10$sLBzpTHEx6GiLNIYaqJ/.Oh2BvarSaGQSJJasnrAhXuzc/ZqAQ.Yi', 'Дмитрий', 'Козлов', 'user', 'user', 1, NOW(), NOW()),
('engineer5@test.com', '$2b$10$sLBzpTHEx6GiLNIYaqJ/.Oh2BvarSaGQSJJasnrAhXuzc/ZqAQ.Yi', 'Михаил', 'Новиков', 'user', 'user', 1, NOW(), NOW());

-- Получаем ID созданных пользователей
SET @user_eng1 = (SELECT id FROM users WHERE email = 'engineer1@test.com');
SET @user_eng2 = (SELECT id FROM users WHERE email = 'engineer2@test.com');
SET @user_eng3 = (SELECT id FROM users WHERE email = 'engineer3@test.com');
SET @user_eng4 = (SELECT id FROM users WHERE email = 'engineer4@test.com');
SET @user_eng5 = (SELECT id FROM users WHERE email = 'engineer5@test.com');

-- Создаем профили инженеров с разными параметрами
INSERT IGNORE INTO engineers (user_id, type, base_rate, overtime_coefficient, plan_hours_month, fixed_salary, fixed_car_amount, is_active, created_at, updated_at)
VALUES 
-- Инженер 1: Стандартный штатный сотрудник
(@user_eng1, 'staff', 700, 1.5, 160, 0, 0, 1, NOW(), NOW()),
-- Инженер 2: С фиксированной зарплатой
(@user_eng2, 'staff', 800, 1.6, 160, 50000, 5000, 1, NOW(), NOW()),
-- Инженер 3: Подрядчик с высокой ставкой
(@user_eng3, 'contractor', 1000, 2.0, 120, 0, 0, 1, NOW(), NOW()),
-- Инженер 4: Стажер с низкой ставкой
(@user_eng4, 'staff', 500, 1.3, 180, 0, 0, 1, NOW(), NOW()),
-- Инженер 5: Старший специалист
(@user_eng5, 'staff', 900, 1.8, 160, 30000, 3000, 1, NOW(), NOW());

-- Получаем ID инженеров
SET @eng1 = (SELECT id FROM engineers WHERE user_id = @user_eng1);
SET @eng2 = (SELECT id FROM engineers WHERE user_id = @user_eng2);
SET @eng3 = (SELECT id FROM engineers WHERE user_id = @user_eng3);
SET @eng4 = (SELECT id FROM engineers WHERE user_id = @user_eng4);
SET @eng5 = (SELECT id FROM engineers WHERE user_id = @user_eng5);

-- ============================================
-- STEP 2: Создание организаций с разными параметрами
-- ============================================

INSERT IGNORE INTO organizations (name, base_rate, overtime_multiplier, has_overtime, is_active, created_at, updated_at)
VALUES 
('Вистекс', 800, 1.5, 1, 1, NOW(), NOW()),
('РусХолтс', 750, 1.6, 1, 1, NOW(), NOW()),
('ТО Франко', 900, 1.4, 1, 1, NOW(), NOW()),
('Холод Сервис', 650, 1.3, 0, 1, NOW(), NOW()),
('Климат Контроль', 1000, 2.0, 1, 1, NOW(), NOW()),
('Морозко', 700, 1.5, 1, 1, NOW(), NOW());

SET @org1 = (SELECT id FROM organizations WHERE name = 'Вистекс');
SET @org2 = (SELECT id FROM organizations WHERE name = 'РусХолтс');
SET @org3 = (SELECT id FROM organizations WHERE name = 'ТО Франко');
SET @org4 = (SELECT id FROM organizations WHERE name = 'Холод Сервис');
SET @org5 = (SELECT id FROM organizations WHERE name = 'Климат Контроль');
SET @org6 = (SELECT id FROM organizations WHERE name = 'Морозко');

-- Получаем ID админа и менеджера
SET @admin_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1);
SET @manager_id = (SELECT id FROM users WHERE role = 'manager' LIMIT 1);
SET @admin_id = COALESCE(@admin_id, 1);
SET @manager_id = COALESCE(@manager_id, @admin_id);

-- ============================================
-- STEP 3: ТЕКУЩИЙ МЕСЯЦ - Все возможные сценарии
-- ============================================

-- ========== WAITING (Ожидающие) - 5 заказов ==========

-- 1. Простой заказ без назначения
INSERT INTO orders (organization_id, title, description, location, distance_km, territory_type, status, source, planned_start_date, created_by, created_at, updated_at)
VALUES (@org1, 'Диагностика холодильника', 'Проверка компрессора', 'ул. Ленина, 15', 10, 'urban', 'waiting', 'manual', DATE_ADD(@current_month_start, INTERVAL 5 DAY), @admin_id, NOW(), NOW());

-- 2. Срочный заказ
INSERT INTO orders (organization_id, title, description, location, distance_km, territory_type, status, source, planned_start_date, created_by, created_at, updated_at)
VALUES (@org2, 'СРОЧНО: Авария холодильной камеры', 'Не работает охлаждение', 'Склад №5', 25, 'suburban', 'waiting', 'email', DATE_ADD(NOW(), INTERVAL 1 DAY), @admin_id, NOW(), NOW());

-- 3. Плановое ТО
INSERT INTO orders (organization_id, title, description, location, distance_km, territory_type, status, source, planned_start_date, created_by, created_at, updated_at)
VALUES (@org3, 'Плановое техобслуживание', 'Ежемесячная профилактика', 'ТЦ Мега', 8, 'zone_1', 'waiting', 'automatic', DATE_ADD(@current_month_start, INTERVAL 15 DAY), @admin_id, NOW(), NOW());

-- 4. Удаленный объект
INSERT INTO orders (organization_id, title, description, location, distance_km, territory_type, status, source, planned_start_date, created_by, created_at, updated_at)
VALUES (@org4, 'Ремонт на складе', 'Замена терморегулятора', 'Промзона, 120км от города', 120, 'rural', 'waiting', 'api', DATE_ADD(@current_month_start, INTERVAL 10 DAY), @admin_id, NOW(), NOW());

-- 5. Заказ без указания даты
INSERT INTO orders (organization_id, title, description, location, distance_km, territory_type, status, source, created_by, created_at, updated_at)
VALUES (@org5, 'Консультация по оборудованию', 'Подбор нового холодильника', 'Офис клиента', 5, 'urban', 'waiting', 'manual', @admin_id, NOW(), NOW());

-- ========== ASSIGNED (Назначенные) - 4 заказа ==========

-- 6. Только что назначенный заказ
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, created_by, created_at, updated_at)
VALUES (@org1, @eng1, @manager_id, 'Замена фреона', 'Перезаправка системы', 'Магазин Пятерочка', 12, 'urban', 'assigned', 'manual', DATE_ADD(@current_month_start, INTERVAL 3 DAY), @admin_id, NOW(), NOW());

-- 7. Назначен на завтра
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, created_by, created_at, updated_at)
VALUES (@org2, @eng2, @manager_id, 'Установка кондиционера', 'Монтаж нового оборудования', 'Ресторан Якитория', 15, 'zone_1', 'assigned', 'manual', DATE_ADD(NOW(), INTERVAL 1 DAY), @admin_id, NOW(), NOW());

-- 8. Назначен на следующую неделю
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, created_by, created_at, updated_at)
VALUES (@org3, @eng3, @manager_id, 'Капитальный ремонт', 'Замена компрессора', 'Завод Молоко', 45, 'suburban', 'assigned', 'email', DATE_ADD(@current_month_start, INTERVAL 7 DAY), @admin_id, NOW(), NOW());

-- 9. Переназначенный заказ
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, created_by, created_at, updated_at)
VALUES (@org4, @eng4, @manager_id, 'Ремонт витрины', 'Не охлаждает', 'Супермаркет Лента', 20, 'urban', 'assigned', 'manual', DATE_ADD(@current_month_start, INTERVAL 2 DAY), @admin_id, NOW(), NOW());

-- ========== PROCESSING (В обработке) - 3 заказа ==========

-- 10. Инженер принял заказ
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, created_by, created_at, updated_at)
VALUES (@org1, @eng1, @manager_id, 'Настройка терморегуляторов', 'Калибровка датчиков', 'Аптека 36.6', 8, 'zone_1', 'processing', 'manual', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), @admin_id, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW());

-- 11. Подготовка к работе
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, created_by, created_at, updated_at)
VALUES (@org2, @eng2, @manager_id, 'Диагностика системы', 'Поиск неисправности', 'Кафе Шоколадница', 6, 'urban', 'processing', 'automatic', @current_month_start, @current_month_start, @admin_id, @current_month_start, NOW());

-- 12. Ожидание запчастей
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, created_by, created_at, updated_at)
VALUES (@org5, @eng5, @manager_id, 'Замена испарителя', 'Требуется новая деталь', 'Склад-холодильник', 35, 'suburban', 'processing', 'manual', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), @admin_id, DATE_SUB(NOW(), INTERVAL 4 DAY), NOW());

-- ========== WORKING (В работе) - 5 заказов ==========

-- 13. Начал работу сегодня
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, created_by, created_at, updated_at)
VALUES (@org1, @eng1, @manager_id, 'Ремонт компрессора', 'Замена масла и фильтров', 'Производство №1', 18, 'zone_1', 'working', 'manual', NOW(), NOW(), @admin_id, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW());

-- 14. Работает второй день
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, created_by, created_at, updated_at)
VALUES (@org2, @eng2, @manager_id, 'Монтаж холодильной камеры', 'Установка промышленного оборудования', 'Мясокомбинат', 50, 'suburban', 'working', 'manual', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), @admin_id, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW());

-- 15. Долгосрочный проект
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, created_by, created_at, updated_at)
VALUES (@org3, @eng3, @manager_id, 'Модернизация системы охлаждения', 'Замена всего оборудования', 'Торговый центр Галерея', 12, 'urban', 'working', 'manual', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), @admin_id, DATE_SUB(NOW(), INTERVAL 6 DAY), NOW());

-- 16. Работа в сельской местности
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, created_by, created_at, updated_at)
VALUES (@org4, @eng4, @manager_id, 'Ремонт на ферме', 'Восстановление молочного охладителя', 'Ферма Рассвет', 95, 'rural', 'working', 'email', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), @admin_id, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW());

-- 17. Срочная работа
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, created_by, created_at, updated_at)
VALUES (@org5, @eng5, @manager_id, 'Аварийный ремонт', 'Утечка хладагента', 'Гипермаркет Ашан', 22, 'zone_1', 'working', 'api', NOW(), NOW(), @admin_id, NOW(), NOW());

-- ========== REVIEW (На проверке) - 6 заказов с разными сценариями ==========

-- 18. Стандартная работа без переработки
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, created_by, created_at, updated_at)
VALUES (@org1, @eng1, @manager_id, 'Плановое ТО №1', 'Профилактика оборудования', 'Магазин Магнит', 10, 'urban', 'review', 'manual', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY),
    6, 0, 4200, 400, 4800,
    700, 1050, 800, 1.5,
    4200, 0, 4800, 0, 600,
    'Работа выполнена в срок', @admin_id, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW());

-- 19. Работа с переработкой (1 час)
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, created_by, created_at, updated_at)
VALUES (@org2, @eng2, @manager_id, 'Ремонт с переработкой', 'Сложный ремонт', 'Ресторан Тануки', 15, 'zone_1', 'review', 'manual', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY),
    8, 1, 7680, 600, 8700,
    800, 1280, 750, 1.6,
    6400, 1280, 6000, 1200, 1020,
    'Потребовалась переработка 1 час', @admin_id, DATE_SUB(NOW(), INTERVAL 4 DAY), NOW());

-- 20. Большая переработка (5 часов)
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, created_by, created_at, updated_at)
VALUES (@org3, @eng3, @manager_id, 'Аварийный ремонт с переработкой', 'Работа до полного восстановления', 'Склад Перекресток', 30, 'suburban', 'review', 'email', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY),
    10, 5, 20000, 1200, 21600,
    1000, 2000, 900, 1.4,
    10000, 10000, 9000, 6300, 1600,
    'Сложная авария, большая переработка', @admin_id, DATE_SUB(NOW(), INTERVAL 5 DAY), NOW());

-- 21. Работа стажера (низкая ставка)
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, created_by, created_at, updated_at)
VALUES (@org4, @eng4, @manager_id, 'Простая диагностика', 'Проверка системы', 'Аптека', 5, 'urban', 'review', 'manual', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY),
    4, 0, 2000, 200, 2600,
    500, 650, 650, 1.3,
    2000, 0, 2600, 0, 600,
    'Работа стажера', @admin_id, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW());

-- 22. Работа без оплаты за машину
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, created_by, created_at, updated_at)
VALUES (@org5, @eng5, @manager_id, 'Работа в городе', 'Близко от базы', 'Офис рядом', 2, 'urban', 'review', 'automatic', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(),
    5, 0, 4500, 0, 5000,
    900, 1620, 1000, 2.0,
    4500, 0, 5000, 0, 500,
    'Без оплаты машины - близко', @admin_id, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW());

-- 23. Максимальная переработка
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, created_by, created_at, updated_at)
VALUES (@org1, @eng1, @manager_id, 'Ночной ремонт', 'Работа в ночную смену', 'Производство 24/7', 40, 'suburban', 'review', 'manual', DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY),
    8, 8, 11200, 1600, 12800,
    700, 1050, 800, 1.5,
    5600, 5600, 6400, 6400, 1600,
    'Полная ночная смена', @admin_id, DATE_SUB(NOW(), INTERVAL 6 DAY), NOW());

-- ========== COMPLETED (Завершенные) - 8 заказов ==========

-- 24. Простой завершенный заказ
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, completion_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, received_from_organization, created_by, created_at, updated_at)
VALUES (@org1, @eng1, @manager_id, 'Замена фильтров', 'Регулярное обслуживание', 'Магазин Дикси', 8, 'zone_1', 'completed', 'manual', 
    DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY),
    5, 0, 3500, 300, 4000,
    700, 1050, 800, 1.5,
    3500, 0, 4000, 0, 500,
    'Стандартная работа', 1, @admin_id, DATE_SUB(NOW(), INTERVAL 10 DAY), NOW());

-- 25. Завершенный с переработкой
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, completion_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, received_from_organization, created_by, created_at, updated_at)
VALUES (@org2, @eng2, @manager_id, 'Капремонт холодильника', 'Полная замена узлов', 'Столовая №5', 20, 'suburban', 'completed', 'email',
    DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY),
    12, 3, 13440, 800, 14700,
    800, 1280, 750, 1.6,
    9600, 3840, 9000, 3600, 1260,
    'Сложный ремонт', 1, @admin_id, DATE_SUB(NOW(), INTERVAL 12 DAY), NOW());

-- 26. Большой проект
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, completion_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, received_from_organization, created_by, created_at, updated_at)
VALUES (@org3, @eng3, @manager_id, 'Установка промышленной системы', 'Монтаж холодильного комплекса', 'Мясокомбинат Рассвет', 75, 'rural', 'completed', 'manual',
    DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 13 DAY),
    20, 4, 28000, 3000, 30600,
    1000, 2000, 900, 1.4,
    20000, 8000, 18000, 5040, 2600,
    'Крупный объект', 1, @admin_id, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW());

-- 27. Быстрая работа
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, completion_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, received_from_organization, created_by, created_at, updated_at)
VALUES (@org4, @eng4, @manager_id, 'Срочная диагностика', 'Быстрая проверка', 'Кафе Старбакс', 3, 'urban', 'completed', 'api',
    DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY),
    2, 0, 1000, 0, 1300,
    500, 650, 650, 1.3,
    1000, 0, 1300, 0, 300,
    'Экспресс-диагностика', 0, @admin_id, DATE_SUB(NOW(), INTERVAL 5 DAY), NOW());

-- 28. Работа старшего специалиста
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, completion_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, received_from_organization, created_by, created_at, updated_at)
VALUES (@org5, @eng5, @manager_id, 'Сложная настройка автоматики', 'Программирование контроллеров', 'Завод Электроника', 28, 'zone_1', 'completed', 'manual',
    DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY),
    10, 2, 12600, 1000, 16000,
    900, 1620, 1000, 2.0,
    9000, 3600, 10000, 4000, 3400,
    'Высококвалифицированная работа', 1, @admin_id, DATE_SUB(NOW(), INTERVAL 8 DAY), NOW());

-- 29. Работа без оплаты от организации
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, completion_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, received_from_organization, created_by, created_at, updated_at)
VALUES (@org1, @eng1, @manager_id, 'Гарантийный ремонт', 'Устранение дефекта', 'Магазин Пятерочка', 10, 'urban', 'completed', 'manual',
    DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY),
    4, 0, 2800, 400, 3200,
    700, 1050, 800, 1.5,
    2800, 0, 3200, 0, 400,
    'Гарантийный случай', 0, @admin_id, DATE_SUB(NOW(), INTERVAL 7 DAY), NOW());

-- 30. Работа с минимальной прибылью
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, completion_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, received_from_organization, created_by, created_at, updated_at)
VALUES (@org4, @eng3, @manager_id, 'Срочная работа для VIP клиента', 'Особые условия', 'VIP офис', 15, 'urban', 'completed', 'manual',
    DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY),
    6, 1, 8000, 600, 8100,
    1000, 2000, 650, 1.3,
    6000, 2000, 3900, 507, 100,
    'VIP клиент, особые условия', 1, @admin_id, DATE_SUB(NOW(), INTERVAL 9 DAY), NOW());

-- 31. Работа с убытком (для демонстрации)
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, completion_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, received_from_organization, created_by, created_at, updated_at)
VALUES (@org4, @eng3, @manager_id, 'Аварийный выезд ночью', 'Срочный ремонт в нерабочее время', 'Удаленный склад', 100, 'rural', 'completed', 'email',
    DATE_SUB(NOW(), INTERVAL 11 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY),
    8, 6, 20000, 4000, 18200,
    1000, 2000, 650, 1.3,
    8000, 12000, 5200, 4056, -1800,
    'Убыточный заказ - аварийный выезд', 1, @admin_id, DATE_SUB(NOW(), INTERVAL 11 DAY), NOW());

-- ========== PAID_TO_ENGINEER (Выплачено инженеру) - 5 заказов ==========

-- 32-36: Различные выплаченные заказы
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, completion_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, received_from_organization, created_by, created_at, updated_at)
VALUES 
(@org1, @eng1, @manager_id, 'Выплачено: Ремонт 1', 'Описание', 'Адрес 1', 12, 'urban', 'paid_to_engineer', 'manual',
    DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 19 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY),
    6, 1, 5250, 500, 6000,
    700, 1050, 800, 1.5,
    4200, 1050, 4800, 1200, 750,
    'Оплачено', 1, @admin_id, DATE_SUB(NOW(), INTERVAL 20 DAY), NOW()),

(@org2, @eng2, @manager_id, 'Выплачено: Ремонт 2', 'Описание', 'Адрес 2', 18, 'zone_1', 'paid_to_engineer', 'email',
    DATE_SUB(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 17 DAY), DATE_SUB(NOW(), INTERVAL 16 DAY),
    8, 0, 6400, 700, 6000,
    800, 1280, 750, 1.6,
    6400, 0, 6000, 0, -400,
    'Оплачено', 1, @admin_id, DATE_SUB(NOW(), INTERVAL 18 DAY), NOW()),

(@org3, @eng3, @manager_id, 'Выплачено: Ремонт 3', 'Описание', 'Адрес 3', 45, 'suburban', 'paid_to_engineer', 'manual',
    DATE_SUB(NOW(), INTERVAL 16 DAY), DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY),
    14, 2, 18000, 1800, 19800,
    1000, 2000, 900, 1.4,
    14000, 4000, 12600, 2520, 1800,
    'Оплачено', 1, @admin_id, DATE_SUB(NOW(), INTERVAL 16 DAY), NOW()),

(@org5, @eng5, @manager_id, 'Выплачено: Ремонт 4', 'Описание', 'Адрес 4', 25, 'zone_1', 'paid_to_engineer', 'automatic',
    DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 13 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY),
    10, 0, 9000, 1000, 10000,
    900, 1620, 1000, 2.0,
    9000, 0, 10000, 0, 1000,
    'Оплачено', 1, @admin_id, DATE_SUB(NOW(), INTERVAL 14 DAY), NOW()),

(@org6, @eng4, @manager_id, 'Выплачено: Ремонт 5', 'Описание', 'Адрес 5', 8, 'urban', 'paid_to_engineer', 'manual',
    DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY),
    5, 0, 2500, 300, 3250,
    500, 650, 700, 1.5,
    2500, 0, 3500, 0, 750,
    'Оплачено', 1, @admin_id, DATE_SUB(NOW(), INTERVAL 12 DAY), NOW());

-- ============================================
-- STEP 4: ПРОШЛЫЙ МЕСЯЦ - Исторические данные
-- ============================================

-- Создаем по 2 завершенных заказа для каждого инженера в прошлом месяце
INSERT INTO orders (organization_id, assigned_engineer_id, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, completion_date,
    regular_hours, overtime_hours, calculated_amount, car_usage_amount, organization_payment,
    engineer_base_rate, engineer_overtime_rate, organization_base_rate, organization_overtime_multiplier,
    regular_payment, overtime_payment, organization_regular_payment, organization_overtime_payment, profit,
    work_notes, received_from_organization, created_by, created_at, updated_at)
VALUES 
-- Инженер 1 - прошлый месяц
(@org1, @eng1, @manager_id, 'Прошлый месяц: Работа 1', 'Описание', 'Адрес', 15, 'urban', 'paid_to_engineer', 'manual',
    @prev_month_start, DATE_ADD(@prev_month_start, INTERVAL 1 DAY), DATE_ADD(@prev_month_start, INTERVAL 2 DAY),
    8, 2, 7350, 600, 8400,
    700, 1050, 800, 1.5,
    5600, 1750, 6400, 2000, 1050,
    'Прошлый месяц', 1, @admin_id, @prev_month_start, @prev_month_end),

(@org2, @eng1, @manager_id, 'Прошлый месяц: Работа 2', 'Описание', 'Адрес', 20, 'zone_1', 'paid_to_engineer', 'manual',
    DATE_ADD(@prev_month_start, INTERVAL 10 DAY), DATE_ADD(@prev_month_start, INTERVAL 11 DAY), DATE_ADD(@prev_month_start, INTERVAL 12 DAY),
    10, 0, 7000, 800, 7500,
    700, 1050, 750, 1.6,
    7000, 0, 7500, 0, 500,
    'Прошлый месяц', 1, @admin_id, DATE_ADD(@prev_month_start, INTERVAL 10 DAY), @prev_month_end),

-- Инженер 2 - прошлый месяц
(@org3, @eng2, @manager_id, 'Прошлый месяц: Работа 3', 'Описание', 'Адрес', 30, 'suburban', 'paid_to_engineer', 'email',
    DATE_ADD(@prev_month_start, INTERVAL 5 DAY), DATE_ADD(@prev_month_start, INTERVAL 6 DAY), DATE_ADD(@prev_month_start, INTERVAL 7 DAY),
    12, 3, 13440, 1200, 14700,
    800, 1280, 750, 1.6,
    9600, 3840, 9000, 3600, 1260,
    'Прошлый месяц', 1, @admin_id, DATE_ADD(@prev_month_start, INTERVAL 5 DAY), @prev_month_end),

(@org4, @eng2, @manager_id, 'Прошлый месяц: Работа 4', 'Описание', 'Адрес', 10, 'urban', 'paid_to_engineer', 'manual',
    DATE_ADD(@prev_month_start, INTERVAL 15 DAY), DATE_ADD(@prev_month_start, INTERVAL 16 DAY), DATE_ADD(@prev_month_start, INTERVAL 17 DAY),
    6, 0, 4800, 400, 4500,
    800, 1280, 750, 1.6,
    4800, 0, 4500, 0, -300,
    'Прошлый месяц', 1, @admin_id, DATE_ADD(@prev_month_start, INTERVAL 15 DAY), @prev_month_end),

-- Инженер 3 - прошлый месяц
(@org5, @eng3, @manager_id, 'Прошлый месяц: Работа 5', 'Описание', 'Адрес', 50, 'rural', 'paid_to_engineer', 'api',
    DATE_ADD(@prev_month_start, INTERVAL 8 DAY), DATE_ADD(@prev_month_start, INTERVAL 9 DAY), DATE_ADD(@prev_month_start, INTERVAL 10 DAY),
    16, 4, 24000, 2000, 27000,
    1000, 2000, 900, 1.4,
    16000, 8000, 14400, 5040, 3000,
    'Прошлый месяц', 1, @admin_id, DATE_ADD(@prev_month_start, INTERVAL 8 DAY), @prev_month_end),

(@org1, @eng3, @manager_id, 'Прошлый месяц: Работа 6', 'Описание', 'Адрес', 25, 'zone_1', 'paid_to_engineer', 'manual',
    DATE_ADD(@prev_month_start, INTERVAL 18 DAY), DATE_ADD(@prev_month_start, INTERVAL 19 DAY), DATE_ADD(@prev_month_start, INTERVAL 20 DAY),
    10, 2, 14000, 1000, 15300,
    1000, 2000, 800, 1.5,
    10000, 4000, 8000, 2400, 1300,
    'Прошлый месяц', 1, @admin_id, DATE_ADD(@prev_month_start, INTERVAL 18 DAY), @prev_month_end);

-- ============================================
-- ИТОГОВАЯ СТАТИСТИКА
-- ============================================

SELECT '✅ Migration completed successfully!' as status;

SELECT 
    '📊 ТЕКУЩИЙ МЕСЯЦ - Статистика по статусам' as report_type,
    status, 
    COUNT(*) as count,
    COALESCE(SUM(calculated_amount), 0) as total_engineer_payment,
    COALESCE(SUM(organization_payment), 0) as total_org_payment,
    COALESCE(SUM(profit), 0) as total_profit
FROM orders 
WHERE created_at >= @current_month_start
GROUP BY status
ORDER BY FIELD(status, 'waiting', 'assigned', 'processing', 'working', 'review', 'completed', 'paid_to_engineer');

SELECT 
    '💰 ТЕКУЩИЙ МЕСЯЦ - Статистика по инженерам' as report_type,
    e.id as engineer_id,
    CONCAT(u.first_name, ' ', u.last_name) as engineer_name,
    COUNT(*) as total_orders,
    COALESCE(SUM(o.regular_hours), 0) as total_regular_hours,
    COALESCE(SUM(o.overtime_hours), 0) as total_overtime_hours,
    COALESCE(SUM(o.calculated_amount), 0) as total_earned,
    COALESCE(SUM(o.car_usage_amount), 0) as total_car_payments
FROM orders o
JOIN engineers e ON o.assigned_engineer_id = e.id
JOIN users u ON e.user_id = u.id
WHERE o.created_at >= @current_month_start
  AND o.status IN ('review', 'completed', 'paid_to_engineer')
GROUP BY e.id, u.first_name, u.last_name
ORDER BY total_earned DESC;

SELECT 
    '🏢 ТЕКУЩИЙ МЕСЯЦ - Статистика по организациям' as report_type,
    org.id as org_id,
    org.name as org_name,
    COUNT(*) as total_orders,
    COALESCE(SUM(o.organization_payment), 0) as total_revenue,
    COALESCE(SUM(o.calculated_amount), 0) as total_costs,
    COALESCE(SUM(o.profit), 0) as total_profit
FROM orders o
JOIN organizations org ON o.organization_id = org.id
WHERE o.created_at >= @current_month_start
  AND o.status IN ('review', 'completed', 'paid_to_engineer')
GROUP BY org.id, org.name
ORDER BY total_profit DESC;

SELECT 
    '📅 ПРОШЛЫЙ МЕСЯЦ - Сводка' as report_type,
    COUNT(*) as total_orders,
    COALESCE(SUM(calculated_amount), 0) as total_engineer_payment,
    COALESCE(SUM(organization_payment), 0) as total_org_payment,
    COALESCE(SUM(profit), 0) as total_profit
FROM orders 
WHERE created_at >= @prev_month_start AND created_at < @current_month_start;
