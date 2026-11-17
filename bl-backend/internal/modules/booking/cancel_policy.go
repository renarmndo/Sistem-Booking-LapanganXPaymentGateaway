package booking

import (
	"time"

	"sistem-booking/internal/constant"
)

const (
	DefaultFullRefundHours      = 24
	DefaultPartialRefundHours   = 6
	DefaultFullRefundPercent    = 100
	DefaultPartialRefundPercent = 50
)

type CancelPolicyConfig struct {
	FullRefundHours      int
	PartialRefundHours   int
	FullRefundPercent    int
	PartialRefundPercent int
}

func (c CancelPolicyConfig) withDefaults() CancelPolicyConfig {
	if c.FullRefundHours <= 0 {
		c.FullRefundHours = DefaultFullRefundHours
	}
	if c.PartialRefundHours <= 0 {
		c.PartialRefundHours = DefaultPartialRefundHours
	}
	if c.FullRefundPercent <= 0 {
		c.FullRefundPercent = DefaultFullRefundPercent
	}
	if c.PartialRefundPercent <= 0 {
		c.PartialRefundPercent = DefaultPartialRefundPercent
	}
	return c
}

type CancelDecision struct {
	Allowed       bool
	RefundPercent int
	RefundAmount  int64
}

// EvaluateCancelPolicy computes whether cancellation is permitted and the refund percentage/amount
// based on booking status, actor role, and remaining time before kick-off (PRD §4.8).
func EvaluateCancelPolicy(
	now time.Time,
	kickoff time.Time,
	totalAmount int64,
	status constant.BookingStatus,
	isAdmin bool,
	cfg CancelPolicyConfig,
) (CancelDecision, error) {
	cfg = cfg.withDefaults()

	if !CanTransition(status, constant.BookingCancelled) {
		return CancelDecision{}, ErrInvalidTransition
	}

	if status == constant.BookingPendingPayment {
		return CancelDecision{
			Allowed:       true,
			RefundPercent: 0,
			RefundAmount:  0,
		}, nil
	}

	remaining := kickoff.Sub(now)
	fullThreshold := time.Duration(cfg.FullRefundHours) * time.Hour
	partialThreshold := time.Duration(cfg.PartialRefundHours) * time.Hour

	if remaining >= fullThreshold {
		return CancelDecision{
			Allowed:       true,
			RefundPercent: cfg.FullRefundPercent,
			RefundAmount:  (totalAmount * int64(cfg.FullRefundPercent)) / 100,
		}, nil
	}

	if remaining >= partialThreshold {
		return CancelDecision{
			Allowed:       true,
			RefundPercent: cfg.PartialRefundPercent,
			RefundAmount:  (totalAmount * int64(cfg.PartialRefundPercent)) / 100,
		}, nil
	}

	if !isAdmin {
		return CancelDecision{}, ErrCancelTooLate
	}

	return CancelDecision{
		Allowed:       true,
		RefundPercent: 0,
		RefundAmount:  0,
	}, nil
}
