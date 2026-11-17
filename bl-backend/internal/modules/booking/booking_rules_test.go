package booking

import (
	"context"
	"errors"
	"testing"
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/pkg/timeutil"
)

type stubPriceResolver struct {
	prices map[string]int64
}

func (s *stubPriceResolver) ResolvePrice(_ context.Context, _ uint, _ time.Time, startTime time.Time) (int64, error) {
	if p, ok := s.prices[startTime.Format(timeutil.ClockLayout)]; ok {
		return p, nil
	}
	return 200000, nil
}

type stubLogWriter struct {
	logs []*BookingLog
}

func (w *stubLogWriter) CreateLog(_ context.Context, log *BookingLog) error {
	w.logs = append(w.logs, log)
	return nil
}

func TestValidateBookingRequest(t *testing.T) {
	now := time.Date(2026, 11, 17, 15, 0, 0, 0, timeutil.WIB)
	today := time.Date(2026, 11, 17, 0, 0, 0, 0, timeutil.WIB)
	tomorrow := today.AddDate(0, 0, 1)

	openField := FieldAvailabilityInfo{
		ID:        1,
		IsActive:  true,
		OpenTime:  "08:00",
		CloseTime: "23:00",
		IsClosed:  false,
		HasHours:  true,
	}
	cfg := ValidationConfig{
		MaxDaysAhead:       30,
		MaxHoursPerBooking: 3,
		SlotMinutes:        60,
	}

	tests := []struct {
		name    string
		date    time.Time
		slots   []SlotInput
		field   FieldAvailabilityInfo
		wantErr error
		wantLen int
	}{
		{
			name:    "valid consecutive slots sorted",
			date:    tomorrow,
			slots:   []SlotInput{{StartTime: "20:00", EndTime: "21:00"}, {StartTime: "19:00", EndTime: "20:00"}},
			field:   openField,
			wantLen: 2,
		},
		{
			name:    "inactive field rejected",
			date:    tomorrow,
			slots:   []SlotInput{{StartTime: "19:00", EndTime: "20:00"}},
			field:   FieldAvailabilityInfo{ID: 1, IsActive: false},
			wantErr: ErrFieldInactive,
		},
		{
			name:    "empty slots rejected",
			date:    tomorrow,
			slots:   nil,
			field:   openField,
			wantErr: ErrSlotsEmpty,
		},
		{
			name: "exceeds max hours per booking",
			date: tomorrow,
			slots: []SlotInput{
				{StartTime: "10:00", EndTime: "11:00"},
				{StartTime: "11:00", EndTime: "12:00"},
				{StartTime: "12:00", EndTime: "13:00"},
				{StartTime: "13:00", EndTime: "14:00"},
			},
			field:   openField,
			wantErr: ErrMaxHoursExceeded,
		},
		{
			name:    "past date rejected",
			date:    today.AddDate(0, 0, -1),
			slots:   []SlotInput{{StartTime: "19:00", EndTime: "20:00"}},
			field:   openField,
			wantErr: ErrDateInPast,
		},
		{
			name:    "date beyond max days ahead rejected",
			date:    today.AddDate(0, 0, 31),
			slots:   []SlotInput{{StartTime: "19:00", EndTime: "20:00"}},
			field:   openField,
			wantErr: ErrDateTooFar,
		},
		{
			name:    "closed day rejected",
			date:    tomorrow,
			slots:   []SlotInput{{StartTime: "19:00", EndTime: "20:00"}},
			field:   FieldAvailabilityInfo{ID: 1, IsActive: true, IsClosed: true, HasHours: true},
			wantErr: ErrFieldClosed,
		},
		{
			name:    "outside operating hours rejected",
			date:    tomorrow,
			slots:   []SlotInput{{StartTime: "07:00", EndTime: "08:00"}},
			field:   openField,
			wantErr: ErrOutsideOperatingHours,
		},
		{
			name:    "non-consecutive slots rejected",
			date:    tomorrow,
			slots:   []SlotInput{{StartTime: "18:00", EndTime: "19:00"}, {StartTime: "20:00", EndTime: "21:00"}},
			field:   openField,
			wantErr: ErrSlotsNotConsecutive,
		},
		{
			name:    "past slot on today rejected",
			date:    today,
			slots:   []SlotInput{{StartTime: "15:00", EndTime: "16:00"}},
			field:   openField,
			wantErr: ErrSlotInPast,
		},
		{
			name:    "future slot on today allowed",
			date:    today,
			slots:   []SlotInput{{StartTime: "16:00", EndTime: "17:00"}},
			field:   openField,
			wantLen: 1,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ValidateBookingRequest(now, tc.date, tc.slots, tc.field, cfg)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("expected error %v, got %v", tc.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(got) != tc.wantLen {
				t.Fatalf("expected %d normalized slots, got %d", tc.wantLen, len(got))
			}
			if tc.wantLen == 2 && got[0].StartTime != "19:00" {
				t.Fatalf("expected sorted first slot 19:00, got %s", got[0].StartTime)
			}
		})
	}
}

func TestCalculateSlotsPricing(t *testing.T) {
	resolver := &stubPriceResolver{
		prices: map[string]int64{
			"18:00": 250000,
			"19:00": 350000,
		},
	}
	date := time.Date(2026, 11, 20, 0, 0, 0, 0, timeutil.WIB)
	slots := []SlotInput{
		{StartTime: "18:00", EndTime: "19:00"},
		{StartTime: "19:00", EndTime: "20:00"},
	}

	priced, total, err := CalculateSlotsPricing(context.Background(), resolver, 1, date, slots)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 600000 {
		t.Fatalf("expected total 600000, got %d", total)
	}
	if len(priced) != 2 || priced[0].Price != 250000 || priced[1].Price != 350000 {
		t.Fatalf("unexpected priced slots: %+v", priced)
	}
}

func TestStateMachineTransitions(t *testing.T) {
	tests := []struct {
		from  constant.BookingStatus
		to    constant.BookingStatus
		valid bool
	}{
		{constant.BookingPendingPayment, constant.BookingConfirmed, true},
		{constant.BookingPendingPayment, constant.BookingExpired, true},
		{constant.BookingPendingPayment, constant.BookingCancelled, true},
		{constant.BookingPendingPayment, constant.BookingCompleted, false},
		{constant.BookingConfirmed, constant.BookingCancelled, true},
		{constant.BookingConfirmed, constant.BookingCompleted, true},
		{constant.BookingConfirmed, constant.BookingPendingPayment, false},
		{constant.BookingConfirmed, constant.BookingExpired, false},
		{constant.BookingExpired, constant.BookingConfirmed, false},
		{constant.BookingExpired, constant.BookingCancelled, false},
		{constant.BookingCancelled, constant.BookingConfirmed, false},
		{constant.BookingCompleted, constant.BookingCancelled, false},
	}

	for _, tc := range tests {
		t.Run(string(tc.from)+"->"+string(tc.to), func(t *testing.T) {
			if got := CanTransition(tc.from, tc.to); got != tc.valid {
				t.Fatalf("CanTransition(%s, %s) = %v, want %v", tc.from, tc.to, got, tc.valid)
			}

			writer := &stubLogWriter{}
			actor := uint(7)
			b := &Booking{ID: 42, Status: tc.from}
			entry, err := Transition(context.Background(), b, tc.to, &actor, "TEST_TRANSITION", "note", writer)
			if tc.valid {
				if err != nil {
					t.Fatalf("unexpected Transition error: %v", err)
				}
				if b.Status != tc.to || len(writer.logs) != 1 || entry.FromStatus != string(tc.from) || entry.ToStatus != string(tc.to) {
					t.Fatalf("expected status %s and 1 log entry, got status=%s logs=%d", tc.to, b.Status, len(writer.logs))
				}
			} else if !errors.Is(err, ErrInvalidTransition) {
				t.Fatalf("expected ErrInvalidTransition, got %v", err)
			}
		})
	}
}

func TestEvaluateCancelPolicy(t *testing.T) {
	now := time.Date(2026, 11, 20, 10, 0, 0, 0, timeutil.WIB)
	cfg := CancelPolicyConfig{}
	total := int64(400000)

	tests := []struct {
		name        string
		kickoff     time.Time
		status      constant.BookingStatus
		isAdmin     bool
		wantPercent int
		wantAmount  int64
		wantErr     error
	}{
		{
			name:        "pending payment cancelled with 0 refund",
			kickoff:     now.Add(2 * time.Hour),
			status:      constant.BookingPendingPayment,
			isAdmin:     false,
			wantPercent: 0,
			wantAmount:  0,
		},
		{
			name:        "confirmed >= 24h gets 100% refund",
			kickoff:     now.Add(24 * time.Hour),
			status:      constant.BookingConfirmed,
			isAdmin:     false,
			wantPercent: 100,
			wantAmount:  400000,
		},
		{
			name:        "confirmed between 6h and 24h gets 50% refund",
			kickoff:     now.Add(10 * time.Hour),
			status:      constant.BookingConfirmed,
			isAdmin:     false,
			wantPercent: 50,
			wantAmount:  200000,
		},
		{
			name:    "confirmed < 6h rejected for user",
			kickoff: now.Add(5 * time.Hour),
			status:  constant.BookingConfirmed,
			isAdmin: false,
			wantErr: ErrCancelTooLate,
		},
		{
			name:        "confirmed < 6h allowed for admin with 0% refund",
			kickoff:     now.Add(5 * time.Hour),
			status:      constant.BookingConfirmed,
			isAdmin:     true,
			wantPercent: 0,
			wantAmount:  0,
		},
		{
			name:    "expired booking cannot be cancelled",
			kickoff: now.Add(48 * time.Hour),
			status:  constant.BookingExpired,
			isAdmin: true,
			wantErr: ErrInvalidTransition,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			decision, err := EvaluateCancelPolicy(now, tc.kickoff, total, tc.status, tc.isAdmin, cfg)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("expected error %v, got %v", tc.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !decision.Allowed || decision.RefundPercent != tc.wantPercent || decision.RefundAmount != tc.wantAmount {
				t.Fatalf("got %+v, want percent=%d amount=%d", decision, tc.wantPercent, tc.wantAmount)
			}
		})
	}
}
