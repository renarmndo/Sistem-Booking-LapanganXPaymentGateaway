INSERT INTO facilities (name, icon)
VALUES
    ('Toilet', 'bath'),
    ('Musholla', 'moon-star'),
    ('Parkir', 'car'),
    ('Kantin', 'utensils'),
    ('Lampu', 'lightbulb'),
    ('Ruang Ganti', 'shirt'),
    ('WiFi', 'wifi')
ON DUPLICATE KEY UPDATE icon = VALUES(icon);
