package report

import (
	"context"
	"errors"
	"testing"
	"time"

	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/timeutil"
)

func TestComputeFieldUtilizationWithClosedDayAndBlocks(t *testing.T) {
	// Mon 2026-11-16 (open 08:00-18:00 = 10h, blocked 2h -> 8h avail)
	// Tue 2026-11-17 (closed = 0h)
	// Wed 2026-11-18 (open 08:00-18:00 = 10h, no blocks -> 10h avail)
	// Total available = 18h; Used = 4.5h => 25.00%
	fromDate, _ := timeutil.ParseDate("2026-11-16")
	toDate, _ := timeutil.ParseDate("2026-11-18")

	hours := []OperatingHourRule{
		{FieldID: 1, DayOfWeek: uint8(time.Monday), OpenTime: "08:00", CloseTime: "18:00", IsClosed: false},
		{FieldID: 1, DayOfWeek: uint8(time.Tuesday), OpenTime: "08:00", CloseTime: "18:00", IsClosed: true},
		{FieldID: 1, DayOfWeek: uint8(time.Wednesday), OpenTime: "08:00", CloseTime: "18:00", IsClosed: false},
	}

	bStart := time.Date(2026, 11, 16, 12, 0, 0, 0, timeutil.WIB)
	bEnd := time.Date(2026, 11, 16, 14, 0, 0, 0, timeutil.WIB)
	blocks := []BlockInterval{{FieldID: 1, StartDatetime: bStart, EndDatetime: bEnd}}

	usedSlots := []UsedSlotRecord{
		{FieldID: 1, SlotDate: fromDate, StartTime: "08:00", EndTime: "10:00"},
		{FieldID: 1, SlotDate: toDate, StartTime: "15:00", EndTime: "17:30"},
	}

	calc := ComputeFieldUtilization(1, "Lapangan A", fromDate, toDate, hours, blocks, usedSlots)
	if calc.OperationalHours != 20 || calc.BlockedHours != 2 || calc.AvailableHours != 18 {
		t.Fatalf("unexpected hours calc: %+v", calc)
	}
	if calc.UsedHours != 4.5 || calc.UtilizationPercent != 25 {
		t.Fatalf("expected 4.5h / 25%%, got %+v", calc)
	}
}

type authScopeMockRepo struct {
	stubReportRepo
	fieldOwners map[uint]uint
	bookings    map[uint]uint // bookingID -> ownerID
}

func (m *authScopeMockRepo) ListFieldsByOwner(_ context.Context, ownerID *uint, fieldID *uint) ([]OwnerFieldBasic, error) {
	var res []OwnerFieldBasic
	for fid, oid := range m.fieldOwners {
		if ownerID != nil && oid != *ownerID {
			continue
		}
		if fieldID != nil && fid != *fieldID {
			continue
		}
		res = append(res, OwnerFieldBasic{ID: fid, OwnerID: oid, Name: "Field"})
	}
	return res, nil
}

func (m *authScopeMockRepo) IsFieldOwnedBy(_ context.Context, fieldID, ownerID uint) (bool, error) {
	return m.fieldOwners[fieldID] == ownerID, nil
}

func (m *authScopeMockRepo) ListScheduleBookings(_ context.Context, _ *uint, _ *uint, _, _ string) ([]OwnerScheduleBooking, error) {
	return nil, nil
}
func (m *authScopeMockRepo) ListScheduleBlocks(_ context.Context, _ *uint, _ *uint, _, _ time.Time) ([]OwnerScheduleBlock, error) {
	return nil, nil
}
func (m *authScopeMockRepo) ListOwnerBookings(_ context.Context, _ uint, _ OwnerBookingFilter) ([]OwnerBookingItem, int64, error) {
	return nil, 0, nil
}
func (m *authScopeMockRepo) FindOwnerBookingByID(_ context.Context, ownerID, bookingID uint) (*OwnerBookingItem, error) {
	if m.bookings[bookingID] != ownerID {
		return nil, nil
	}
	return &OwnerBookingItem{ID: bookingID}, nil
}
func (m *authScopeMockRepo) ListOwnerTransactions(_ context.Context, _ uint, _ OwnerTransactionFilter) ([]OwnerTransactionItem, int64, int64, error) {
	return nil, 0, 0, nil
}
func (m *authScopeMockRepo) GetPaidRevenueSummary(_ context.Context, _ *uint, _ *uint, _, _ string) (int64, int64, int64, int64, error) {
	return 0, 0, 0, 0, nil
}
func (m *authScopeMockRepo) GetRevenueSeries(_ context.Context, _ *uint, _ *uint, _, _, _ string) ([]RevenuePoint, error) {
	return nil, nil
}
func (m *authScopeMockRepo) GetOperatingHoursForFields(_ context.Context, _ []uint) ([]OperatingHourRule, error) {
	return nil, nil
}
func (m *authScopeMockRepo) GetUsedSlotsForFields(_ context.Context, _ []uint, _, _ string) ([]UsedSlotRecord, error) {
	return nil, nil
}

func TestOwnerAuthorizationReturns404ForOtherOwner(t *testing.T) {
	repo := &authScopeMockRepo{
		fieldOwners: map[uint]uint{10: 1, 20: 2},
		bookings:    map[uint]uint{100: 1, 200: 2},
	}
	svc := NewService(repo, nil)

	ownerA := uint(1)
	fieldB := uint(20)

	if _, err := svc.GetOwnerSchedule(context.Background(), ownerA, &fieldB, "2026-11-01", "2026-11-07"); err == nil {
		t.Fatalf("expected 404 when owner A requests owner B schedule")
	} else {
		var appErr *apperror.AppError
		if !errors.As(err, &appErr) || appErr.HTTPStatus != 404 {
			t.Fatalf("expected 404 AppError, got %v", err)
		}
	}

	if _, err := svc.GetOwnerBookingDetail(context.Background(), ownerA, 200); err == nil {
		t.Fatalf("expected 404 when owner A requests owner B booking detail")
	} else {
		var appErr *apperror.AppError
		if !errors.As(err, &appErr) || appErr.HTTPStatus != 404 {
			t.Fatalf("expected 404 AppError, got %v", err)
		}
	}
}
