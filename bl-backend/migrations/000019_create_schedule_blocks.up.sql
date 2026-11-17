CREATE TABLE schedule_blocks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    field_id BIGINT UNSIGNED NOT NULL,
    start_datetime DATETIME(6) NOT NULL,
    end_datetime DATETIME(6) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_schedule_blocks_field_time (field_id, start_datetime, end_datetime),
    CONSTRAINT fk_schedule_blocks_field_id FOREIGN KEY (field_id) REFERENCES fields (id) ON DELETE CASCADE,
    CONSTRAINT fk_schedule_blocks_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
