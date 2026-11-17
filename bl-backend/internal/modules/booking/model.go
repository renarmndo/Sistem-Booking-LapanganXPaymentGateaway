package booking

import (
	"time"

	"sistem-booking/internal/constant"
)

type Booking struct {
	ID           uint                   `gorm:"primaryKey"`
	Code         string                 `gorm:"size:32;uniqueIndex;not null"`
	UserID       *uint                  `gorm:"index:idx_bookings_user_status"`
	GuestName    string                 `gorm:"size:100"`
	GuestPhone   string                 `gorm:"size:20"`
	FieldID      uint                   `gorm:"not null;index:idx_bookings_field_date"`
	BookingDate  time.Time              `gorm:"type:date;not null;index:idx_bookings_field_date"`
	StartTime    string                 `gorm:"type:time;not null"`
	EndTime      string                 `gorm:"type:time;not null"`
	TotalAmount  int64                  `gorm:"not null"`
	Status       constant.BookingStatus `gorm:"type:enum('PENDING_PAYMENT','CONFIRMED','EXPIRED','CANCELLED','COMPLETED');not null;default:'PENDING_PAYMENT'"`
	Source       constant.BookingSource `gorm:"type:enum('online','offline');not null;default:'online'"`
	ExpiresAt    *time.Time             `gorm:"index:idx_bookings_status_expires"`
	CancelledAt  *time.Time
	CancelReason string                 `gorm:"size:255"`
	CreatedBy    *uint
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Slots        []BookingSlot          `gorm:"foreignKey:BookingID"`
}

func (Booking) TableName() string { return "bookings" }

type BookingSlot struct {
	ID        uint      `gorm:"primaryKey"`
	BookingID uint      `gorm:"not null;index"`
	FieldID   uint      `gorm:"not null;index:idx_booking_slots_field_date"`
	SlotDate  time.Time `gorm:"type:date;not null;index:idx_booking_slots_field_date"`
	StartTime string    `gorm:"type:time;not null"`
	EndTime   string    `gorm:"type:time;not null"`
	Price     int64     `gorm:"not null"`
	ActiveKey *int8     `gorm:"default:1"`
	CreatedAt time.Time
}

func (BookingSlot) TableName() string { return "booking_slots" }

type BookingLog struct {
	ID         uint      `gorm:"primaryKey"`
	BookingID  uint      `gorm:"not null;index"`
	ActorID    *uint
	Action     string    `gorm:"size:50;not null"`
	FromStatus string    `gorm:"size:30"`
	ToStatus   string    `gorm:"size:30;not null"`
	Note       string    `gorm:"size:255"`
	CreatedAt  time.Time
}

func (BookingLog) TableName() string { return "booking_logs" }
