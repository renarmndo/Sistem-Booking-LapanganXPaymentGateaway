package schedule

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/timeutil"
)

type mockFieldProvider struct {
	info *FieldScheduleInfo
}

func (m mockFieldProvider) GetScheduleInfo(_ context.Context, _ uint, _ uint8) (*FieldScheduleInfo, error) {
	return m.info, nil
}

func (m mockFieldProvider) ResolvePrice(_ context.Context, _ uint, _ time.Time, startTime time.Time) (int64, error) {
	if startTime.Hour() >= 18 {
		return 250000, nil
	}
	return 150000, nil
}

type mockSettings struct {
	values map[string]int
}

func (m mockSettings) GetInt(_ context.Context, key string, fallback int) int {
	if v, ok := m.values[key]; ok {
		return v
	}
	return fallback
}

func assertScheduleErrCode(t *testing.T, err error, code string) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error %s, got nil", code)
	}
	var appErr *apperror.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("expected AppError, got %T: %v", err, err)
	}
	if appErr.Code != code {
		t.Fatalf("expected %s, got %s", code, appErr.Code)
	}
}

func TestGenerateSlotsAndAvailability(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 11, 17, 14, 30, 0, 0, timeutil.WIB)
	settings := mockSettings{values: map[string]int{
		"booking.slot_minutes":   60,
		"booking.max_days_ahead": 30,
	}}

	// 1. Open 08:00 - 23:00 on future date -> 15 slots
	openInfo := &FieldScheduleInfo{
		ID: 1, IsActive: true, OpenTime: "08:00:00", CloseTime: "23:00:00", IsClosed: false, HasHours: true,
	}
	svc := NewService(mockFieldProvider{info: openInfo}, settings, nil).(*service)
	svc.now = func() time.Time { return now }

	slots, err := svc.GetAvailability(ctx, 1, "2026-11-18")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(slots) != 15 {
		t.Fatalf("expected 15 slots (08-23), got %d", len(slots))
	}
	if slots[0].StartTime != "08:00" || slots[0].EndTime != "09:00" || slots[0].Price != 150000 || slots[0].Status != SlotAvailable {
		t.Fatalf("unexpected first slot: %+v", slots[0])
	}
	if slots[10].StartTime != "18:00" || slots[10].Price != 250000 {
		t.Fatalf("expected peak price 250000 at 18:00, got %+v", slots[10])
	}

	// 2. Today at 14:30 -> 08:00..14:00 are past, 15:00..22:00 are available
	todaySlots, err := svc.GetAvailability(ctx, 1, "2026-11-17")
	if err != nil {
		t.Fatalf("today availability failed: %v", err)
	}
	if todaySlots[6].StartTime != "14:00" || todaySlots[6].Status != SlotPast {
		t.Fatalf("expected 14:00 to be past at 14:30, got %+v", todaySlots[6])
	}
	if todaySlots[7].StartTime != "15:00" || todaySlots[7].Status != SlotAvailable {
		t.Fatalf("expected 15:00 to be available at 14:30, got %+v", todaySlots[7])
	}

	// 3. Past date -> 422 ErrPastDate
	_, err = svc.GetAvailability(ctx, 1, "2026-11-16")
	assertScheduleErrCode(t, err, ErrPastDate.Code)

	// 4. Too far date -> 422 ErrDateTooFar
	_, err = svc.GetAvailability(ctx, 1, "2026-12-20")
	assertScheduleErrCode(t, err, ErrDateTooFar.Code)

	// 5. Closed day -> 0 slots
	closedSvc := NewService(mockFieldProvider{info: &FieldScheduleInfo{
		ID: 1, IsActive: true, OpenTime: "08:00:00", CloseTime: "23:00:00", IsClosed: true, HasHours: true,
	}}, settings, nil).(*service)
	closedSvc.now = func() time.Time { return now }

	closedSlots, err := closedSvc.GetAvailability(ctx, 1, "2026-11-18")
	if err != nil {
		t.Fatalf("closed day failed: %v", err)
	}
	if len(closedSlots) != 0 {
		t.Fatalf("expected 0 slots on closed day, got %d", len(closedSlots))
	}

	// 6. HTTP handler returns 422 on past date and 200 on valid date
	mux := http.NewServeMux()
	RegisterPublicRoutes(mux, NewHandler(svc))

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/fields/1/availability?date=2026-11-16", nil))
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/fields/1/availability?date=2026-11-18", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}
