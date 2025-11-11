-- Quick fix: Update admin user role to ADMIN
-- Run this on the server to fix admin@coffee.com role immediately

UPDATE users 
SET 
  role = 'admin',
  primary_role = 'admin',
  active_role = NULL
WHERE email = 'admin@coffee.com';

-- Verify the update
SELECT id, email, role, primary_role, active_role, is_active 
FROM users 
WHERE email = 'admin@coffee.com';

