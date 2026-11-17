package constant

type PaymentStatus string

const (
	PaymentPending   PaymentStatus = "pending"
	PaymentPaid      PaymentStatus = "paid"
	PaymentFailed    PaymentStatus = "failed"
	PaymentCancelled PaymentStatus = "cancelled"
	PaymentExpired   PaymentStatus = "expired"
	PaymentChallenge PaymentStatus = "challenge"
	PaymentRefunded  PaymentStatus = "refunded"
	PaymentUnpaid    PaymentStatus = "unpaid"
	PaymentPartial   PaymentStatus = "partial"
)
