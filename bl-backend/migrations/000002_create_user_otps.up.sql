CREATE TABLE user_otps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(254) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    type ENUM('REGISTRATION') NOT NULL DEFAULT 'REGISTRATION',
    expires_at DATETIME(6) NOT NULL,
    used_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_user_otps_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    KEY idx_user_otps_user_type_used (user_id, type, used_at),
    KEY idx_user_otps_lookup (email, otp_code, used_at, expires_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
