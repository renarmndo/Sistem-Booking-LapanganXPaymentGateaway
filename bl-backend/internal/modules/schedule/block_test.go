package schedule

import (
	"context"
	"errors"
	"testing"
	"time"

	"sistem-booking/pkg/timeutil"
)

type memBlockRepo struct {
	nextID uint
	items  map[uint]ScheduleBlock
}

func newMemBlockRepo() *memBlockRepo {
	return &memBlockRepo{nextID: 1, items: make(map[uint]ScheduleBlock)}
}

func (m *memBlockRepo) Create(_ context.Context, b *ScheduleBlock) error {
	b.ID = m.nextID
	m.nextID++
	m.items[b.ID] = *b
	return nil
}

func (m *memBlockRepo) Update(_ context.Context, b *ScheduleBlock) error {
	m.items[b.ID] = *b
	return nil
}

func (m *memBlockRepo) Delete(_ context.Context, id uint) error {
	delete(m.items, id)
	return nil
}

func (m *memBlockRepo) FindByID(_ context.Context, id uint) (*ScheduleBlock, error) {
	b, ok := m.items[id]
	if !ok {
		return nil, nil
	}
	cp := b
	return &cp, nil
}

func (m *memBlockRepo) List(_ context.Context, _ ScheduleBlockFilter) ([]ScheduleBlock, int64, error) {
	var res []ScheduleBlock
	for _, b := range m.items {
		res = append(res, b)
	}
	return res, int64(len(res)), nil
}

func (m *memBlockRepo) FindByFieldAndRange(_ context.Context, fieldID uint, start, end time.Time) ([]ScheduleBlock, error) {
	var res []ScheduleBlock
	for _, b := range m.items {
		if b.FieldID == fieldID && b.StartDatetime.Before(end) && b.EndDatetime.After(start) {
			res = append(res, b)
		}
	}
	return res, nil
}

type stubConflictChecker struct {
	conflicts []ConflictingBooking
}

func (s stubConflictChecker) FindConflictingBookings(_ context.Context, _ uint, _, _ time.Time) ([]ConflictingBooking, error) {
	return s.conflicts, nil
}

type stubFieldProvider struct{}

func (stubFieldProvider) GetScheduleInfo(_ context.Context, fieldID uint, _ uint8) (*FieldScheduleInfo, error) {
	return &FieldScheduleInfo{
		ID:        fieldID,
		IsActive:  true,
		OpenTime:  "08:00",
		CloseTime: "12:00",
		IsClosed:  false,
		HasHours:  true,
	}, nil
}

func (stubFieldProvider) ResolvePrice(_ context.Context, _ uint, _ time.Time, _ time.Time) (int64, error) {
	return 150000, nil
}

type stubSettings struct{}

func (stubSettings) GetInt(_ context.Context, _ string, fallback int) int { return fallback }

func TestScheduleBlockConflictAndAvailability(t *testing.T) {
	tomorrow := timeutil.StartOfDay(timeutil.Now()).AddDate(0, 0, 1).Format(timeutil.DateLayout)
	svc := NewService(stubFieldProvider{}, stubSettings{}, NoopOccupancyProvider{})
	repo := newMemBlockRepo()

	// 1. Conflict returns ErrBlockConflict + conflicting bookings
	svc.SetBlockDeps(repo, stubConflictChecker{
		conflicts: []ConflictingBooking{{ID: 99, Code: "BK-CONFLICT", Status: "CONFIRMED"}},
	})
	_, conflicts, err := svc.CreateBlock(context.Background(), 1, CreateScheduleBlockRequest{
		FieldID:       1,
		StartDatetime: tomorrow + " 09:00",
		EndDatetime:   tomorrow + " 11:00",
		Reason:        "Perawatan rumput",
	})
	if !errors.Is(err, ErrBlockConflict) || len(conflicts) != 1 {
		t.Fatalf("expected conflict error with 1 booking, got err=%v conflicts=%d", err, len(conflicts))
	}

	// 2. Without conflict, block is created and marks slots 09:00 & 10:00 as blocked
	svc.SetBlockDeps(repo, stubConflictChecker{})
	block, conflicts, err := svc.CreateBlock(context.Background(), 1, CreateScheduleBlockRequest{
		FieldID:       1,
		StartDatetime: tomorrow + " 09:00",
		EndDatetime:   tomorrow + " 11:00",
		Reason:        "Perawatan rumput",
	})
	if err != nil || len(conflicts) != 0 || block == nil {
		t.Fatalf("expected block created, got err=%v", err)
	}

	slots, err := svc.GetAvailability(context.Background(), 1, tomorrow)
	if err != nil {
		t.Fatalf("GetAvailability failed: %v", err)
	}
	statusByStart := make(map[string]SlotStatus)
	for _, s := range slots {
		statusByStart[s.StartTime] = s.Status
	}
	if statusByStart["08:00"] != SlotAvailable || statusByStart["09:00"] != SlotBlocked || statusByStart["10:00"] != SlotBlocked {
		t.Fatalf("unexpected slot statuses: %+v", statusByStart)
	}
}
