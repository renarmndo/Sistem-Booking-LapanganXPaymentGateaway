INSERT INTO users (
    name,
    email,
    phone,
    password_hash,
    role,
    is_active,
    verification_status,
    verified_at,
    must_change_password,
    token_version
)
VALUES
    (
        'Demo Admin',
        'admin@example.com',
        '081234567890',
        '$2a$10$xtUc9kxg3Y4u6sHJqC1n2eEOl/F0gkk.nyGAc0tgROuZiPjVhAcWO',
        'admin',
        TRUE,
        'VERIFIED',
        CURRENT_TIMESTAMP(6),
        FALSE,
        1
    ),
    (
        'Demo User',
        'user@example.com',
        '081234567891',
        '$2a$10$2JSy6XvdRoPqw4eucER6iOMebsXLOoLKxOfrElvfXvtZWYvHQ.T82',
        'user',
        TRUE,
        'VERIFIED',
        CURRENT_TIMESTAMP(6),
        FALSE,
        1
    ),
    (
        'Demo Owner',
        'owner@example.com',
        '081234567892',
        '$2a$10$W9seku5pe/ahQ1OZYxptT.q4S8J1cJS0F5RIFPiLdNr8zPWBg77mK',
        'owner',
        TRUE,
        'VERIFIED',
        CURRENT_TIMESTAMP(6),
        FALSE,
        1
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    phone = VALUES(phone),
    password_hash = VALUES(password_hash),
    role = VALUES(role),
    is_active = VALUES(is_active),
    verification_status = VALUES(verification_status),
    verified_at = VALUES(verified_at),
    must_change_password = VALUES(must_change_password),
    deleted_at = NULL;
