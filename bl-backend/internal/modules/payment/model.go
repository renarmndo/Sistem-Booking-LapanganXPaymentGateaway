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
	ID         uint      `gorm:"primaryKey" json:"id"`
	PaymentID  uint      `gorm:"not null;index" json:"payment_id"`
	Event      string    `gorm:"size:64;not null" json:"event"`
	RawPayload string    `gorm:"type:json;not null" json:"raw_payload"`
	CreatedAt  time.Time `json:"created_at"`
}

func (PaymentLog) TableName() string { return "payment_logs" }

type RefundRequest struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	BookingID   uint       `gorm:"not null;index" json:"booking_id"`
	PaymentID   uint       `gorm:"not null;index" json:"payment_id"`
	Amount      int64      `gorm:"not null" json:"amount"`
	Status      string     `gorm:"type:enum('pending','processed','rejected');not null;default:'pending'" json:"status"`
	Reason      string     `gorm:"size:255" json:"reason"`
	ProcessedBy *uint      `json:"processed_by,omitempty"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
	Note        string     `gorm:"size:255" json:"note"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (RefundRequest) TableName() string { return "refund_requests" }
