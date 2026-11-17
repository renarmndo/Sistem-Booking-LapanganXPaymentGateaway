CREATE TABLE operating_hours (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    field_id BIGINT UNSIGNED NOT NULL,
    day_of_week TINYINT UNSIGNED NOT NULL,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_operating_hours_field_day (field_id, day_of_week),
    CONSTRAINT chk_operating_hours_day_of_week CHECK (day_of_week <= 6),
    CONSTRAINT fk_operating_hours_field_id FOREIGN KEY (field_id) REFERENCES fields (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
