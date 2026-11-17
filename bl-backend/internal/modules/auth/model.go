package auth

import (
	"time"

	"sistem-booking/internal/constant"
)

type User struct {
	ID                 uint                        `gorm:"primaryKey"`
	Name               string                      `gorm:"size:100;not null"`
	Email              string                      `gorm:"size:254;uniqueIndex;not null"`
	Phone              string                      `gorm:"size:20;not null"`
	PasswordHash       string                      `gorm:"size:255;not null"`
	Role               constant.Role               `gorm:"type:enum('admin','user','owner');not null"`
	IsActive           bool                        `gorm:"not null"`
	VerificationStatus constant.VerificationStatus `gorm:"type:enum('UNVERIFIED','VERIFIED');not null"`
	VerifiedAt         *time.Time
	MustChangePassword bool
	TokenVersion       uint
	CreatedAt          time.Time
	UpdatedAt          time.Time
	DeletedAt          *time.Time `gorm:"index"`
}

type UserOTP struct {
	ID        uint
	UserID    uint
	Email     string
	OTPCode   string
	Type      constant.OTPType
	ExpiresAt time.Time
	UsedAt    *time.Time
	CreatedAt time.Time
}

type RefreshToken struct {
	ID         uint
	UserID     uint
	TokenHash  string
	FamilyID   string
	ExpiresAt  time.Time
	RevokedAt  *time.Time
	UserAgent  string
	IP         string
	LastUsedAt *time.Time
	CreatedAt  time.Time
}
