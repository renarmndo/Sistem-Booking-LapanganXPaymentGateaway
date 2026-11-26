package booking

import (
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/pkg/pagination"
)

type CreateBookingRequest struct {
	FieldID     uint        `json:"field_id" validate:"required,gt=0"`
	Date        string      `json:"date" validate:"required"`
	Slots       []SlotInput `json:"slots" validate:"required,min=1,dive"`
	PaymentType string      `json:"payment_type" validate:"omitempty,oneof=full dp"`
}

type PaymentStubResult struct {
	Provider    string `json:"provider"`
	Token       string `json:"token"`
	RedirectURL string `json:"redirect_url"`
}

type CreateBookingResponse struct {
	BookingID   uint              `json:"booking_id"`
	Code        string            `json:"code"`
	Total       int64             `json:"total"`
	PayAmount   int64             `json:"pay_amount"`
	PaymentType string            `json:"payment_type"`
	ExpiresAt   time.Time         `json:"expires_at"`
	Payment     PaymentStubResult `json:"payment"`
}

type FieldSummaryDTO struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	SurfaceType string `json:"surface_type"`
	CoverURL    string `json:"cover_url"`
}

type BookingSlotDTO struct {
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	Price     int64  `json:"price"`
}

type BookingPaymentDTO struct {
	Provider string `json:"provider"`
	Status   string `json:"status"`
	Channel  string `json:"channel,omitempty"`
	Amount   int64  `json:"amount,omitempty"`
}

type RefundSummaryDTO struct {
	Status string `json:"status"`
	Amount int64  `json:"amount"`
	Reason string `json:"reason,omitempty"`
}

type BookingDetailResponse struct {
	ID           uint                   `json:"id"`
	Code         string                 `json:"code"`
	Field        FieldSummaryDTO        `json:"field"`
	BookingDate  string                 `json:"booking_date"`
	StartTime    string                 `json:"start_time"`
	EndTime      string                 `json:"end_time"`
	TotalAmount  int64                  `json:"total_amount"`
	PaidAmount   int64                  `json:"paid_amount"`
	Status       constant.BookingStatus `json:"status"`
	Source       constant.BookingSource `json:"source"`
	ExpiresAt    *time.Time             `json:"expires_at"`
	CancelledAt  *time.Time             `json:"cancelled_at"`
	CancelReason string                 `json:"cancel_reason"`
	Slots        []BookingSlotDTO       `json:"slots"`
	Payment      BookingPaymentDTO      `json:"payment"`
	Refund       *RefundSummaryDTO      `json:"refund,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
}

type PaginatedBookingsResponse struct {
	Items []BookingDetailResponse `json:"items"`
	Meta  pagination.Meta         `json:"meta"`
}

type CancelBookingRequest struct {
	Reason string `json:"reason" validate:"max=255"`
}

type CancelBookingResponse struct {
	ID            uint                   `json:"id"`
	Code          string                 `json:"code"`
	Status        constant.BookingStatus `json:"status"`
	RefundPercent int                    `json:"refund_percent"`
	RefundAmount  int64                  `json:"refund_amount"`
}

type OfflineCustomerInput struct {
	UserID     *uint  `json:"user_id"`
	GuestName  string `json:"guest_name" validate:"omitempty,max=100"`
	GuestPhone string `json:"guest_phone" validate:"omitempty,max=20"`
}

type OfflinePaymentInput struct {
	Method     string `json:"method" validate:"required,oneof=cash transfer_manual"`
	Status     string `json:"status" validate:"required,oneof=paid partial unpaid"`
	AmountPaid int64  `json:"amount_paid" validate:"min=0"`
	Note       string `json:"note" validate:"omitempty,max=255"`
}

type CreateOfflineBookingRequest struct {
	FieldID  uint                 `json:"field_id" validate:"required,gt=0"`
	Date     string               `json:"date" validate:"required"`
	Slots    []SlotInput          `json:"slots" validate:"required,min=1,dive"`
	Customer OfflineCustomerInput `json:"customer" validate:"required"`
	Payment  OfflinePaymentInput  `json:"payment" validate:"required"`
}

type AdminPaymentRequest struct {
	Amount int64  `json:"amount" validate:"required,gt=0"`
	Method string `json:"method" validate:"required,oneof=cash transfer_manual"`
	Note   string `json:"note" validate:"omitempty,max=255"`
}

type AdminPaymentResponse struct {
	BookingID     uint   `json:"booking_id"`
	PaymentStatus string `json:"payment_status"`
	PaidTotal     int64  `json:"paid_total"`
	TotalAmount   int64  `json:"total_amount"`
	Remaining     int64  `json:"remaining"`
}

type AdminCancelBookingRequest struct {
	Reason       string `json:"reason" validate:"required,min=3,max=255"`
	CreateRefund bool   `json:"create_refund"`
	RefundAmount int64  `json:"refund_amount" validate:"min=0"`
}

type AdminBookingFilter struct {
	Date          string
	From          string
	To            string
	FieldID       *uint
	Status        string
	PaymentStatus string
	Source        string
	Query         string
	Sort          string
	Pagination    pagination.Query
}

type BookingLogDTO struct {
	ID         uint      `json:"id"`
	ActorID    *uint     `json:"actor_id,omitempty"`
	Action     string    `json:"action"`
	FromStatus string    `json:"from_status"`
	ToStatus   string    `json:"to_status"`
	Note       string    `json:"note"`
	CreatedAt  time.Time `json:"created_at"`
}

type AdminBookingItemResponse struct {
	BookingDetailResponse
	UserID        *uint           `json:"user_id,omitempty"`
	CustomerName  string          `json:"customer_name"`
	CustomerPhone string          `json:"customer_phone"`
	PaidAmount    int64           `json:"paid_amount"`
	Logs          []BookingLogDTO `json:"logs,omitempty"`
}

type PaginatedAdminBookingsResponse struct {
	Items []AdminBookingItemResponse `json:"items"`
	Meta  pagination.Meta            `json:"meta"`
}

type UserBasicInfo struct {
	Name  string
	Phone string
}

type BookingPaymentSummary struct {
	Provider   string
	Channel    string
	Status     string
	Amount     int64
	PaidAmount int64
}
