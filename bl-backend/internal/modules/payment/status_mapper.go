package payment

import (
	"strings"

	"sistem-booking/internal/constant"
)

type StatusMapping struct {
	PaymentStatus constant.PaymentStatus
	BookingStatus constant.BookingStatus
	IsFinal       bool
}

// MapMidtransStatus maps Midtrans transaction_status & fraud_status to internal statuses (PRD §4.5).
func MapMidtransStatus(txStatus, fraudStatus string) (StatusMapping, bool) {
	tx := strings.ToLower(strings.TrimSpace(txStatus))
	fraud := strings.ToLower(strings.TrimSpace(fraudStatus))

	switch tx {
	case "settlement":
		return StatusMapping{PaymentStatus: constant.PaymentPaid, BookingStatus: constant.BookingConfirmed, IsFinal: true}, true
	case "capture":
		if fraud == "challenge" {
			return StatusMapping{PaymentStatus: constant.PaymentChallenge, BookingStatus: constant.BookingPendingPayment}, true
		}
		if fraud == "deny" {
			return StatusMapping{PaymentStatus: constant.PaymentFailed, BookingStatus: constant.BookingCancelled, IsFinal: true}, true
		}
		return StatusMapping{PaymentStatus: constant.PaymentPaid, BookingStatus: constant.BookingConfirmed, IsFinal: true}, true
	case "pending":
		return StatusMapping{PaymentStatus: constant.PaymentPending, BookingStatus: constant.BookingPendingPayment}, true
	case "deny", "failure":
		return StatusMapping{PaymentStatus: constant.PaymentFailed, BookingStatus: constant.BookingCancelled, IsFinal: true}, true
	case "cancel":
		return StatusMapping{PaymentStatus: constant.PaymentCancelled, BookingStatus: constant.BookingCancelled, IsFinal: true}, true
	case "expire":
		return StatusMapping{PaymentStatus: constant.PaymentExpired, BookingStatus: constant.BookingExpired, IsFinal: true}, true
	case "refund", "partial_refund":
		return StatusMapping{PaymentStatus: constant.PaymentRefunded, BookingStatus: constant.BookingCancelled, IsFinal: true}, true
	default:
		return StatusMapping{}, false
	}
}

var allowedPaymentTransitions = map[constant.PaymentStatus]map[constant.PaymentStatus]bool{
	constant.PaymentPending: {
		constant.PaymentPaid:      true,
		constant.PaymentFailed:    true,
		constant.PaymentCancelled: true,
		constant.PaymentExpired:   true,
		constant.PaymentChallenge: true,
	},
	constant.PaymentChallenge: {
		constant.PaymentPaid:      true,
		constant.PaymentFailed:    true,
		constant.PaymentCancelled: true,
		constant.PaymentExpired:   true,
	},
	constant.PaymentPaid: {
		constant.PaymentRefunded: true,
	},
	constant.PaymentFailed:    {},
	constant.PaymentCancelled: {},
	constant.PaymentExpired:   {},
	constant.PaymentRefunded:  {},
}

// CanTransitionPayment prevents downgrading final payment statuses (e.g. paid -> pending/expired).
func CanTransitionPayment(from, to constant.PaymentStatus) bool {
	if from == to {
		return false
	}
	targets, ok := allowedPaymentTransitions[from]
	if !ok {
		return false
	}
	return targets[to]
}
