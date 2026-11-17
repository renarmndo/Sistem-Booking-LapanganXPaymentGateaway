DELETE FROM users
WHERE email IN (
    'admin@example.com',
    'user@example.com',
    'owner@example.com'
);
