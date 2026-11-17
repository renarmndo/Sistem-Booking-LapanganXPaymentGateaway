CREATE TABLE field_photos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    field_id BIGINT UNSIGNED NOT NULL,
    url VARCHAR(512) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_field_photos_field_sort (field_id, sort_order),
    CONSTRAINT fk_field_photos_field_id FOREIGN KEY (field_id) REFERENCES fields (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
