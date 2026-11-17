package constant

type BookingStatus string

const (
	BookingPendingPayment BookingStatus = "PENDING_PAYMENT"
	BookingConfirmed      BookingStatus = "CONFIRMED"
	BookingExpired        BookingStatus = "EXPIRED"
	BookingCancelled      BookingStatus = "CANCELLED"
	BookingCompleted      BookingStatus = "COMPLETED"
)
