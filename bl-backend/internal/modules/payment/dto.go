package payment

import (
	"time"

	"sistem-booking/internal/constant"
)

type SnapPayResponse struct {
	OrderID     string `json:"order_id"`
	SnapToken   string `json:"snap_token"`
	RedirectURL string `json:"redirect_url"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

type SyncPaymentResponse struct {
	OrderID       string                 `json:"order_id"`
	PaymentStatus constant.PaymentStatus `json:"payment_status"`
	BookingStatus constant.BookingStatus `json:"booking_status"`
	NeedsReview   bool                   `json:"needs_review"`
}

type BookingPaymentInfo struct {
	ID          uint
	Code        string
	UserID      *uint
	FieldID     uint
	BookingDate time.Time
	TotalAmount int64
	Status      constant.BookingStatus
	ExpiresAt   *time.Time
}
