INSERT INTO settings (setting_key, setting_value, description)
VALUES
    ('booking.payment_ttl_minutes', '15', 'Batas waktu pembayaran booking dalam menit'),
    ('booking.max_days_ahead', '30', 'Batas maksimal hari pemesanan ke depan'),
    ('booking.slot_minutes', '60', 'Durasi satu slot pemesanan dalam menit'),
    ('booking.max_pending_per_user', '3', 'Batas maksimal booking pending per pengguna')
ON DUPLICATE KEY UPDATE
    setting_value = VALUES(setting_value),
    description = VALUES(description);
