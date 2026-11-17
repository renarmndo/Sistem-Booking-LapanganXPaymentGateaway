CREATE TABLE booking_slots (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id BIGINT UNSIGNED NOT NULL,
    field_id BIGINT UNSIGNED NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price BIGINT NOT NULL,
    active_key TINYINT NULL DEFAULT 1,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_active_slot (field_id, slot_date, start_time, active_key),
    KEY idx_booking_slots_field_date (field_id, slot_date),
    KEY idx_booking_slots_booking_id (booking_id),
    CONSTRAINT fk_booking_slots_booking_id FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_slots_field_id FOREIGN KEY (field_id) REFERENCES fields (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
