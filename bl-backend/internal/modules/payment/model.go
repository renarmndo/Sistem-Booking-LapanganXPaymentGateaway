package payment

import (
	"time"

	"sistem-booking/internal/constant"
)

type Payment struct {
	ID              uint                   `gorm:"primaryKey"`
	BookingID       uint                   `gorm:"not null;index"`
	OrderID         string                 `gorm:"size:64;uniqueIndex;not null"`
	Method          string                 `gorm:"type:enum('midtrans','cash','transfer_manual');not null;default:'midtrans'"`
	Channel         string                 `gorm:"size:50"`
	Amount          int64                  `gorm:"not null"`
	Status          constant.PaymentStatus `gorm:"type:enum('pending','paid','failed','cancelled','expired','challenge','refunded','unpaid','partial');not null;default:'pending'"`
	SnapToken       string                 `gorm:"size:255"`
	SnapRedirectURL string                 `gorm:"size:512"`
	TransactionID   string                 `gorm:"size:100"`
	PaidAt          *time.Time
	NeedsReview     bool
	RecordedBy      *uint
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (Payment) TableName() string { return "payments" }

type PaymentLog struct {
	ID         uint      `gorm:"primaryKey"`
	PaymentID  uint      `gorm:"not null;index"`
	Event      string    `gorm:"size:64;not null"`
	RawPayload string    `gorm:"type:json;not null"`
	CreatedAt  time.Time
}

func (PaymentLog) TableName() string { return "payment_logs" }

type RefundRequest struct {
	ID          uint       `gorm:"primaryKey"`
	BookingID   uint       `gorm:"not null;index"`
	PaymentID   uint       `gorm:"not null;index"`
	Amount      int64      `gorm:"not null"`
	Status      string     `gorm:"type:enum('pending','processed','rejected');not null;default:'pending'"`
	Reason      string     `gorm:"size:255"`
	ProcessedBy *uint
	ProcessedAt *time.Time
	Note        string     `gorm:"size:255"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (RefundRequest) TableName() string { return "refund_requests" }
