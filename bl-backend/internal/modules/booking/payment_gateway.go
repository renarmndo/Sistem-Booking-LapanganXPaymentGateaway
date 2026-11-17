package booking

import "context"

// PaymentGateway abstracts payment token generation (stubbed in Phase 3, Midtrans Snap in Phase 4).
type PaymentGateway interface {
	CreatePayment(ctx context.Context, booking *Booking) (*PaymentStubResult, error)
}

type StubPaymentGateway struct{}

func NewStubPaymentGateway() *StubPaymentGateway {
	return &StubPaymentGateway{}
}

func (g *StubPaymentGateway) CreatePayment(_ context.Context, booking *Booking) (*PaymentStubResult, error) {
	return &PaymentStubResult{
		Provider:    "midtrans_stub",
		Token:       "stub-snap-" + booking.Code,
		RedirectURL: "https://app.sandbox.midtrans.com/snap/v2/vtweb/stub-" + booking.Code,
	}, nil
}
