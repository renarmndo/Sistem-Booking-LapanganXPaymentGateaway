package booking

import (
	"context"
	"time"

	"sistem-booking/pkg/timeutil"
)

// PriceResolver resolves the authoritative slot price from field pricing rules.
type PriceResolver interface {
	ResolvePrice(ctx context.Context, fieldID uint, date time.Time, startTime time.Time) (int64, error)
}

type PricedSlot struct {
	StartTime string
	EndTime   string
	Price     int64
}

// CalculateSlotsPricing snapshots every slot price from the backend PriceResolver
// and computes total_amount = sum(slot.price), ignoring any client-supplied prices.
func CalculateSlotsPricing(
	ctx context.Context,
	resolver PriceResolver,
	fieldID uint,
	bookingDate time.Time,
	slots []SlotInput,
) ([]PricedSlot, int64, error) {
	if len(slots) == 0 {
		return nil, 0, ErrSlotsEmpty
	}

	dateWIB := timeutil.StartOfDay(bookingDate)
	priced := make([]PricedSlot, 0, len(slots))
	var total int64

	for _, slot := range slots {
		clockTime, err := timeutil.ParseClock(slot.StartTime)
		if err != nil {
			return nil, 0, ErrInvalidSlotFormat
		}
		price, err := resolver.ResolvePrice(ctx, fieldID, dateWIB, clockTime)
		if err != nil {
			return nil, 0, err
		}
		priced = append(priced, PricedSlot{
			StartTime: slot.StartTime,
			EndTime:   slot.EndTime,
			Price:     price,
		})
		total += price
	}

	return priced, total, nil
}
