package booking

import (
	"context"
	"errors"
	"testing"
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/lock"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/timeutil"
)

type stubCacheInvalidator struct {
	prefixes []string
}

func (c *stubCacheInvalidator) DeleteByPrefix(_ context.Context, prefix string) error {
	c.prefixes = append(c.prefixes, prefix)
	return nil
}

func TestOccupancyAndUserQueryIsolation(t *testing.T) {
	repo := newConcurrentMemoryRepo()
	locker := lock.NewMemoryLocker()
	cache := &stubCacheInvalidator{}
	svc := NewServiceWithCache(
		repo,
		&stubFieldSchedule{},
		&stubPriceResolver{prices: map[string]int64{"19:00": 300000}},
		nil,
		locker,
		NewStubPaymentGateway(),
		cache,
	)

	tomorrow := timeutil.Now().AddDate(0, 0, 1)
	dateStr := tomorrow.Format(timeutil.DateLayout)

	created, err := svc.CreateOnlineBooking(context.Background(), 10, CreateBookingRequest{
		FieldID: 1,
		Date:    dateStr,
		Slots:   []SlotInput{{StartTime: "19:00", EndTime: "20:00"}},
	})
	if err != nil {
		t.Fatalf("unexpected create error: %v", err)
	}

	// Task 3.5: newly booked PENDING_PAYMENT slot immediately appears as locked
	occ, err := svc.GetOccupiedSlots(context.Background(), 1, tomorrow)
	if err != nil {
		t.Fatalf("unexpected occupancy error: %v", err)
	}
	if occ["19:00"] != "locked" {
		t.Fatalf("expected 19:00 to be locked, got %q", occ["19:00"])
	}
	if len(cache.prefixes) == 0 {
		t.Fatalf("expected availability cache invalidation on create")
	}

	// Task 3.6: User 10 can read their own booking; User 99 gets 404 ErrBookingNotFound
	list, err := svc.ListMyBookings(context.Background(), 10, "", pagination.Query{Page: 1, Limit: 10})
	if err != nil || len(list.Items) != 1 || list.Items[0].Field.Name != "Arena A" {
		t.Fatalf("expected 1 booking for user 10, got %+v err=%v", list, err)
	}

	detail, err := svc.GetMyBookingDetail(context.Background(), 10, created.BookingID)
	if err != nil || detail.Code != created.Code {
		t.Fatalf("expected user 10 to read booking detail, got %+v err=%v", detail, err)
	}

	_, err = svc.GetMyBookingDetail(context.Background(), 99, created.BookingID)
	if !errors.Is(err, ErrBookingNotFound) {
		t.Fatalf("expected ErrBookingNotFound for user 99, got %v", err)
	}
}

func TestCancelMyBooking_TimePolicyScenarios(t *testing.T) {
	now := time.Date(2026, 11, 20, 10, 0, 0, 0, timeutil.WIB)
	uid := uint(1)

	tests := []struct {
		name        string
		status      constant.BookingStatus
		kickoff     time.Time
		wantPercent int
		wantAmount  int64
		wantErr     bool
	}{
		{
			name:        "pending payment cancelled with 0 refund and slot released",
			status:      constant.BookingPendingPayment,
			kickoff:     now.Add(2 * time.Hour),
			wantPercent: 0,
			wantAmount:  0,
		},
		{
			name:    "confirmed booking rejected because paid bookings are non-cancellable",
			status:  constant.BookingConfirmed,
			kickoff: now.Add(25 * time.Hour),
			wantErr: true,
		},
	}

	for i, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := newConcurrentMemoryRepo()
			locker := lock.NewMemoryLocker()
			cache := &stubCacheInvalidator{}
			svc := NewServiceWithCache(repo, &stubFieldSchedule{}, &stubPriceResolver{}, nil, locker, NewStubPaymentGateway(), cache).(*service)
			svc.now = func() time.Time { return now }

			bookingID := uint(i + 1)
			startClock := tc.kickoff.Format(timeutil.ClockLayout) + ":00"
			active := int8(1)
			repo.bookings[bookingID] = Booking{
				ID:          bookingID,
				Code:        "BK-TEST",
				UserID:      &uid,
				FieldID:     1,
				BookingDate: timeutil.StartOfDay(tc.kickoff),
				StartTime:   startClock,
				EndTime:     "23:00:00",
				TotalAmount: 300000,
				Status:      tc.status,
				Source:      constant.BookingSourceOnline,
			}
			slotKey := "1|" + tc.kickoff.Format(timeutil.DateLayout) + "|" + startClock
			repo.activeSlots[slotKey] = BookingSlot{
				ID:        bookingID,
				BookingID: bookingID,
				FieldID:   1,
				SlotDate:  timeutil.StartOfDay(tc.kickoff),
				StartTime: startClock,
				EndTime:   "23:00:00",
				Price:     300000,
				ActiveKey: &active,
			}

			res, err := svc.CancelMyBooking(context.Background(), uid, bookingID, "Berubah jadwal")
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error for confirmed booking cancel, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected cancel error: %v", err)
			}
			if res.Status != constant.BookingCancelled || res.RefundPercent != tc.wantPercent || res.RefundAmount != tc.wantAmount {
				t.Fatalf("unexpected cancel response: %+v", res)
			}
			if len(repo.activeSlots) != 0 {
				t.Fatalf("expected active slot to be released, got %d remaining", len(repo.activeSlots))
			}
			if len(repo.logs) != 1 || repo.logs[0].Action != "USER_CANCEL" {
				t.Fatalf("expected USER_CANCEL log entry, got %+v", repo.logs)
			}
		})
	}
}
