package midtrans

import (
	"context"
	"time"
)

// Gateway abstracts Midtrans Snap & Core API operations for easy mocking in tests.
type Gateway interface {
	CreateSnapTransaction(ctx context.Context, req SnapRequest) (*SnapResponse, error)
	GetTransactionStatus(ctx context.Context, orderID string) (*TransactionStatusResponse, error)
	CancelTransaction(ctx context.Context, orderID string) error
	VerifySignature(orderID, statusCode, grossAmount, signatureKey string) bool
}

type ItemDetail struct {
	ID       string `json:"id"`
	Price    int64  `json:"price"`
	Quantity int    `json:"quantity"`
	Name     string `json:"name"`
}

type CustomerDetail struct {
	FirstName string `json:"first_name,omitempty"`
	Email     string `json:"email,omitempty"`
	Phone     string `json:"phone,omitempty"`
}

type ExpiryConfig struct {
	StartTime string `json:"start_time"`
	Unit      string `json:"unit"`
	Duration  int    `json:"duration"`
}

type CallbackConfig struct {
	Finish string `json:"finish,omitempty"`
}

type SnapRequest struct {
	TransactionDetails TransactionDetails `json:"transaction_details"`
	ItemDetails        []ItemDetail       `json:"item_details,omitempty"`
	CustomerDetails    *CustomerDetail    `json:"customer_details,omitempty"`
	Expiry             *ExpiryConfig      `json:"expiry,omitempty"`
	Callbacks          *CallbackConfig    `json:"callbacks,omitempty"`
	ExpiresAt          time.Time          `json:"-"`
}

type TransactionDetails struct {
	OrderID     string `json:"order_id"`
	GrossAmount int64  `json:"gross_amount"`
}

type SnapResponse struct {
	Token       string `json:"token"`
	RedirectURL string `json:"redirect_url"`
}

type TransactionStatusResponse struct {
	OrderID           string `json:"order_id"`
	TransactionID     string `json:"transaction_id"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
	PaymentType       string `json:"payment_type"`
	GrossAmount       string `json:"gross_amount"`
	StatusCode        string `json:"status_code"`
}

type NotificationPayload struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	TransactionID     string `json:"transaction_id"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
	PaymentType       string `json:"payment_type"`
}
