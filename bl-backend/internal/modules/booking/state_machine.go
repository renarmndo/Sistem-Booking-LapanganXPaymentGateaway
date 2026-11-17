package booking

import (
	"context"

	"sistem-booking/internal/constant"
	"sistem-booking/pkg/timeutil"
)

// LogWriter persists booking status transition audit entries.
type LogWriter interface {
	CreateLog(ctx context.Context, log *BookingLog) error
}

var allowedTransitions = map[constant.BookingStatus]map[constant.BookingStatus]bool{
	constant.BookingPendingPayment: {
		constant.BookingConfirmed: true,
		constant.BookingExpired:   true,
		constant.BookingCancelled: true,
	},
	constant.BookingConfirmed: {
		constant.BookingCancelled: true,
		constant.BookingCompleted: true,
	},
	constant.BookingExpired:   {},
	constant.BookingCancelled: {},
	constant.BookingCompleted: {},
}

// CanTransition returns true if moving from -> to is permitted by PRD §5.1.
func CanTransition(from, to constant.BookingStatus) bool {
	targets, ok := allowedTransitions[from]
	if !ok {
		return false
	}
	return targets[to]
}

// Transition validates the state change, updates booking.Status, and writes a booking_log entry.
func Transition(
	ctx context.Context,
	booking *Booking,
	to constant.BookingStatus,
	actorID *uint,
	action string,
	note string,
	writer LogWriter,
) (*BookingLog, error) {
	from := booking.Status
	if !CanTransition(from, to) {
		return nil, ErrInvalidTransition
	}

	booking.Status = to
	entry := &BookingLog{
		BookingID:  booking.ID,
		ActorID:    actorID,
		Action:     action,
		FromStatus: string(from),
		ToStatus:   string(to),
		Note:       note,
		CreatedAt:  timeutil.Now(),
	}

	if writer != nil {
		if err := writer.CreateLog(ctx, entry); err != nil {
			return nil, err
		}
	}

	return entry, nil
}
