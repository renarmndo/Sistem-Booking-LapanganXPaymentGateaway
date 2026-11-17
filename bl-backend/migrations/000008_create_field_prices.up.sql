CREATE TABLE field_prices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    field_id BIGINT UNSIGNED NOT NULL,
    day_type ENUM('weekday', 'weekend', 'holiday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price_per_slot BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_field_prices_lookup (field_id, day_type, start_time, end_time),
    CONSTRAINT fk_field_prices_field_id FOREIGN KEY (field_id) REFERENCES fields (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
