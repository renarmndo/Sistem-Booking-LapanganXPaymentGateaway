package schedule

import (
	"context"
	"fmt"
	"strings"
	"time"

	"sistem-booking/pkg/timeutil"
)

const (
	defaultSlotMinutes  = 60
	defaultMaxDaysAhead = 30
)

// FieldProvider supplies field status, operating hours, and slot pricing without importing field.
type FieldProvider interface {
	GetScheduleInfo(ctx context.Context, fieldID uint, dayOfWeek uint8) (*FieldScheduleInfo, error)
	ResolvePrice(ctx context.Context, fieldID uint, date time.Time, startTime time.Time) (int64, error)
}

// SettingReader reads dynamic schedule settings.
type SettingReader interface {
	GetInt(ctx context.Context, key string, fallback int) int
}

// OccupancyProvider returns occupied/locked/blocked slots keyed by "HH:MM" start time.
type OccupancyProvider interface {
	GetOccupiedSlots(ctx context.Context, fieldID uint, date time.Time) (map[string]SlotStatus, error)
}

// NoopOccupancyProvider is the default Fase 2 implementation before booking/blocks exist.
type NoopOccupancyProvider struct{}

func (NoopOccupancyProvider) GetOccupiedSlots(_ context.Context, _ uint, _ time.Time) (map[string]SlotStatus, error) {
	return map[string]SlotStatus{}, nil
}

type Service interface {
	GetAvailability(ctx context.Context, fieldID uint, dateStr string) ([]SlotItem, error)
}

type service struct {
	fields    FieldProvider
	settings  SettingReader
	occupancy OccupancyProvider
	now       func() time.Time
}

func NewService(fields FieldProvider, settings SettingReader, occupancy OccupancyProvider) Service {
	if occupancy == nil {
		occupancy = NoopOccupancyProvider{}
	}
	return &service{
		fields:    fields,
		settings:  settings,
		occupancy: occupancy,
		now:       timeutil.Now,
	}
}

func (s *service) GetAvailability(ctx context.Context, fieldID uint, dateStr string) ([]SlotItem, error) {
	targetDate, err := timeutil.ParseDate(strings.TrimSpace(dateStr))
	if err != nil {
		return nil, ErrInvalidDate
	}

	now := s.now().In(timeutil.WIB)
	today := timeutil.StartOfDay(now)
	if targetDate.Before(today) {
		return nil, ErrPastDate
	}

	maxDays := defaultMaxDaysAhead
	slotMinutes := defaultSlotMinutes
	if s.settings != nil {
		maxDays = s.settings.GetInt(ctx, "booking.max_days_ahead", defaultMaxDaysAhead)
		slotMinutes = s.settings.GetInt(ctx, "booking.slot_minutes", defaultSlotMinutes)
	}
	if slotMinutes <= 0 {
		slotMinutes = defaultSlotMinutes
	}
	if targetDate.After(today.AddDate(0, 0, maxDays)) {
		return nil, ErrDateTooFar
	}

	dayOfWeek := uint8(targetDate.Weekday())
	info, err := s.fields.GetScheduleInfo(ctx, fieldID, dayOfWeek)
	if err != nil {
		return nil, err
	}
	if info == nil {
		return nil, ErrFieldNotFound
	}
	if !info.IsActive {
		return nil, ErrFieldInactive
	}
	if !info.HasHours || info.IsClosed {
		return []SlotItem{}, nil
	}

	openMin, errOpen := parseClockMinutes(info.OpenTime)
	closeMin, errClose := parseClockMinutes(info.CloseTime)
	if errOpen != nil || errClose != nil || openMin >= closeMin {
		return []SlotItem{}, nil
	}

	occupied, err := s.occupancy.GetOccupiedSlots(ctx, fieldID, targetDate)
	if err != nil {
		return nil, err
	}

	slots := make([]SlotItem, 0, (closeMin-openMin)/slotMinutes)
	for curMin := openMin; curMin+slotMinutes <= closeMin; curMin += slotMinutes {
		startClock := formatClock(curMin)
		endClock := formatClock(curMin + slotMinutes)
		slotStartTime := time.Date(
			targetDate.Year(),
			targetDate.Month(),
			targetDate.Day(),
			curMin/60,
			curMin%60,
			0,
			0,
			timeutil.WIB,
		)

		price, err := s.fields.ResolvePrice(ctx, fieldID, targetDate, slotStartTime)
		if err != nil {
			return nil, err
		}

		status := SlotAvailable
		if !slotStartTime.After(now) {
			status = SlotPast
		} else if occStatus, exists := occupied[startClock]; exists {
			status = occStatus
		}

		slots = append(slots, SlotItem{
			StartTime: startClock,
			EndTime:   endClock,
			Price:     price,
			Status:    status,
		})
	}

	return slots, nil
}

func parseClockMinutes(value string) (int, error) {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) >= 5 {
		trimmed = trimmed[:5]
	}
	parsed, err := timeutil.ParseClock(trimmed)
	if err != nil {
		return 0, err
	}
	return parsed.Hour()*60 + parsed.Minute(), nil
}

func formatClock(totalMinutes int) string {
	return fmt.Sprintf("%02d:%02d", totalMinutes/60, totalMinutes%60)
}
