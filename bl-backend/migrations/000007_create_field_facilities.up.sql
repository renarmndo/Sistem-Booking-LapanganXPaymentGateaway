CREATE TABLE field_facilities (
    field_id BIGINT UNSIGNED NOT NULL,
    facility_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (field_id, facility_id),
    KEY idx_field_facilities_facility_id (facility_id),
    CONSTRAINT fk_field_facilities_field_id FOREIGN KEY (field_id) REFERENCES fields (id) ON DELETE CASCADE,
    CONSTRAINT fk_field_facilities_facility_id FOREIGN KEY (facility_id) REFERENCES facilities (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
