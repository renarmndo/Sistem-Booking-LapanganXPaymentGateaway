DELETE FROM settings
WHERE setting_key IN (
    'booking.payment_ttl_minutes',
    'booking.max_days_ahead',
    'booking.slot_minutes',
    'booking.max_pending_per_user'
);
