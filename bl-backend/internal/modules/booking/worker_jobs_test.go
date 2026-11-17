package booking

import (
	"context"
	"testing"
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/lock"
	"sistem-booking/pkg/timeutil"
)

func TestWorkerJobs_ExpireCompleteAndRecover(t *testing.T) {
	repo := newConcurrentMemoryRepo()
	locker := lock.NewMemoryLocker()
	cache := &stubCacheInvalidator{}
	svc := NewServiceWithCache(repo, &stubFieldSchedule{}, &stubPriceResolver{}, nil, locker, NewStubPaymentGateway(), cache).(*service)

	now := time.Date(2026, 11, 20, 18, 0, 0, 0, timeutil.WIB)
	svc.now = func() time.Time { return now }

	// 1. Overdue PENDING_PAYMENT booking
	pastExp := now.Add(-1 * time.Minute)
	active := int8(1)
	uid := uint(1)
	repo.bookings[1] = Booking{
		ID:          1,
		Code:        "BK-EXPIRE",
		UserID:      &uid,
		FieldID:     1,
		BookingDate: timeutil.StartOfDay(now),
		StartTime:   "19:00:00",
		EndTime:     "20:00:00",
		TotalAmount: 250000,
		Status:      constant.BookingPendingPayment,
		ExpiresAt:   &pastExp,
	}
	repo.activeSlots["1|2026-11-20|19:00:00"] = BookingSlot{
		ID: 1, BookingID: 1, FieldID: 1, SlotDate: timeutil.StartOfDay(now),
		StartTime: "19:00:00", EndTime: "20:00:00", Price: 250000, ActiveKey: &active,
	}
	_, _ = locker.AcquireMany(context.Background(), []string{constant.SlotLockKey(1, "2026-11-20", "19:00")}, "tok", time.Minute)

	// 2. Finished CONFIRMED booking
	repo.bookings[2] = Booking{
		ID:          2,
		Code:        "BK-DONE",
		UserID:      &uid,
		FieldID:     1,
		BookingDate: timeutil.StartOfDay(now),
		StartTime:   "16:00:00",
		EndTime:     "17:00:00",
		TotalAmount: 250000,
		Status:      constant.BookingConfirmed,
	}

	// 3. Still-valid PENDING_PAYMENT booking (for startup lock recovery)
	futureExp := now.Add(10 * time.Minute)
	repo.bookings[3] = Booking{
		ID:          3,
		Code:        "BK-RECOVER",
		UserID:      &uid,
		FieldID:     1,
		BookingDate: timeutil.StartOfDay(now),
		StartTime:   "21:00:00",
		EndTime:     "22:00:00",
		TotalAmount: 250000,
		Status:      constant.BookingPendingPayment,
		ExpiresAt:   &futureExp,
	}
	repo.activeSlots["1|2026-11-20|21:00:00"] = BookingSlot{
		ID: 2, BookingID: 3, FieldID: 1, SlotDate: timeutil.StartOfDay(now),
		StartTime: "21:00:00", EndTime: "22:00:00", Price: 250000, ActiveKey: &active,
	}

	expiredCount, err := svc.ExpireOverdueBookings(context.Background())
	if err != nil || expiredCount != 1 {
		t.Fatalf("expected 1 expired booking, got %d err=%v", expiredCount, err)
	}
	if repo.bookings[1].Status != constant.BookingExpired {
		t.Fatalf("expected booking 1 status EXPIRED, got %s", repo.bookings[1].Status)
	}
	// Slot 19:00 is back to available (not in occupied slots & lock released)
	occ, _ := svc.GetOccupiedSlots(context.Background(), 1, now)
	if _, exists := occ["19:00"]; exists {
		t.Fatalf("expected 19:00 to be available after expire")
	}
	ok, _ := locker.AcquireMany(context.Background(), []string{constant.SlotLockKey(1, "2026-11-20", "19:00")}, "probe", time.Minute)
	if !ok {
		t.Fatalf("expected expired lock 19:00 to be released")
	}

	completedCount, err := svc.CompleteFinishedBookings(context.Background())
	if err != nil || completedCount != 1 {
		t.Fatalf("expected 1 completed booking, got %d err=%v", completedCount, err)
	}
	if repo.bookings[2].Status != constant.BookingCompleted {
		t.Fatalf("expected booking 2 status COMPLETED, got %s", repo.bookings[2].Status)
	}

	recovered, err := svc.RecoverPendingLocks(context.Background())
	if err != nil || recovered != 1 {
		t.Fatalf("expected 1 recovered lock, got %d err=%v", recovered, err)
	}
	okRecover, _ := locker.AcquireMany(context.Background(), []string{constant.SlotLockKey(1, "2026-11-20", "21:00")}, "probe2", time.Minute)
	if okRecover {
		t.Fatalf("expected 21:00 lock to be held after startup recovery")
	}
}
