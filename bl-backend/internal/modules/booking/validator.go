package booking

import (
	"sort"
	"strings"
	"time"

	"sistem-booking/pkg/timeutil"
)

const (
	DefaultMaxDaysAhead       = 30
	DefaultMaxHoursPerBooking = 4
	DefaultSlotMinutes        = 60
)

type ValidationConfig struct {
	MaxDaysAhead       int
	MaxHoursPerBooking int
	SlotMinutes        int
}

func (c ValidationConfig) withDefaults() ValidationConfig {
	if c.MaxDaysAhead <= 0 {
		c.MaxDaysAhead = DefaultMaxDaysAhead
	}
	if c.MaxHoursPerBooking <= 0 {
		c.MaxHoursPerBooking = DefaultMaxHoursPerBooking
	}
	if c.SlotMinutes <= 0 {
		c.SlotMinutes = DefaultSlotMinutes
	}
	return c
}

type FieldAvailabilityInfo struct {
	ID        uint
	IsActive  bool
	OpenTime  string
	CloseTime string
	IsClosed  bool
	HasHours  bool
}

type SlotInput struct {
	StartTime string `json:"start_time" validate:"required"`
	EndTime   string `json:"end_time" validate:"required"`
}

type parsedSlot struct {
	raw       SlotInput
	startMin  int
	endMin    int
	startTime time.Time
}

// ValidateBookingRequest validates field status, date boundaries, operating hours,
// consecutive slots, and maximum hours per booking, returning normalized sorted slots.
func ValidateBookingRequest(
	now time.Time,
	bookingDate time.Time,
	slots []SlotInput,
	field FieldAvailabilityInfo,
	cfg ValidationConfig,
) ([]SlotInput, error) {
	cfg = cfg.withDefaults()

	if !field.IsActive {
		return nil, ErrFieldInactive
	}
	if len(slots) == 0 {
		return nil, ErrSlotsEmpty
	}
	if len(slots) > cfg.MaxHoursPerBooking {
		return nil, ErrMaxHoursExceeded
	}

	nowWIB := now.In(timeutil.WIB)
	today := timeutil.StartOfDay(nowWIB)
	targetDate := timeutil.StartOfDay(bookingDate)

	if targetDate.Before(today) {
		return nil, ErrDateInPast
	}
	maxDate := today.AddDate(0, 0, cfg.MaxDaysAhead)
	if targetDate.After(maxDate) {
		return nil, ErrDateTooFar
	}

	if !field.HasHours || field.IsClosed {
		return nil, ErrFieldClosed
	}

	openMin, err := parseClockMinutes(field.OpenTime)
	if err != nil {
		return nil, ErrFieldClosed
	}
	closeMin, err := parseClockMinutes(field.CloseTime)
	if err != nil || closeMin <= openMin {
		return nil, ErrFieldClosed
	}

	parsed := make([]parsedSlot, 0, len(slots))
	for _, s := range slots {
		startMin, err := parseClockMinutes(s.StartTime)
		if err != nil {
			return nil, ErrInvalidSlotFormat
		}
		endMin, err := parseClockMinutes(s.EndTime)
		if err != nil || endMin <= startMin {
			return nil, ErrInvalidSlotFormat
		}
		if endMin-startMin != cfg.SlotMinutes {
			return nil, ErrInvalidSlotFormat
		}
		if startMin < openMin || endMin > closeMin {
			return nil, ErrOutsideOperatingHours
		}
		slotStartDT := time.Date(
			targetDate.Year(), targetDate.Month(), targetDate.Day(),
			startMin/60, startMin%60, 0, 0, timeutil.WIB,
		)
		if targetDate.Equal(today) && !slotStartDT.After(nowWIB) {
			return nil, ErrSlotInPast
		}
		parsed = append(parsed, parsedSlot{
			raw: SlotInput{
				StartTime: formatMinutes(startMin),
				EndTime:   formatMinutes(endMin),
			},
			startMin:  startMin,
			endMin:    endMin,
			startTime: slotStartDT,
		})
	}

	sort.Slice(parsed, func(i, j int) bool {
		return parsed[i].startMin < parsed[j].startMin
	})

	for i := 1; i < len(parsed); i++ {
		if parsed[i].startMin != parsed[i-1].endMin {
			return nil, ErrSlotsNotConsecutive
		}
	}

	normalized := make([]SlotInput, len(parsed))
	for i, p := range parsed {
		normalized[i] = p.raw
	}
	return normalized, nil
}

func parseClockMinutes(raw string) (int, error) {
	trimmed := strings.TrimSpace(raw)
	if len(trimmed) >= 5 {
		trimmed = trimmed[:5]
	}
	t, err := timeutil.ParseClock(trimmed)
	if err != nil {
		return 0, err
	}
	return t.Hour()*60 + t.Minute(), nil
}

func formatMinutes(total int) string {
	h := total / 60
	m := total % 60
	return time.Date(2000, 1, 1, h, m, 0, 0, timeutil.WIB).Format(timeutil.ClockLayout)
}
