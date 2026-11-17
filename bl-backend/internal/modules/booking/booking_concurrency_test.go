package booking

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/lock"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/timeutil"
	"sistem-booking/pkg/validator"
)

type concurrentMemoryRepo struct {
	mu          sync.Mutex
	nextID      uint
	bookings    map[uint]Booking
	codes       map[string]bool
	activeSlots map[string]BookingSlot
	logs        []BookingLog
}

func newConcurrentMemoryRepo() *concurrentMemoryRepo {
	return &concurrentMemoryRepo{
		nextID:      1,
		bookings:    make(map[uint]Booking),
		codes:       make(map[string]bool),
		activeSlots: make(map[string]BookingSlot),
	}
}

func (r *concurrentMemoryRepo) RunInTx(ctx context.Context, fn func(txRepo Repository) error) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	return fn(&concurrentTxRepo{parent: r})
}

func (r *concurrentMemoryRepo) CountPendingByUser(_ context.Context, userID uint) (int64, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var count int64
	for _, b := range r.bookings {
		if b.UserID != nil && *b.UserID == userID && b.Status == constant.BookingPendingPayment {
			count++
		}
	}
	return count, nil
}

func (r *concurrentMemoryRepo) CreateBooking(_ context.Context, _ *Booking) error {
	return errors.New("must run in tx")
}

func (r *concurrentMemoryRepo) CreateBookingSlots(_ context.Context, _ []BookingSlot) error {
	return errors.New("must run in tx")
}

func (r *concurrentMemoryRepo) CreateLog(_ context.Context, _ *BookingLog) error {
	return errors.New("must run in tx")
}

func (r *concurrentMemoryRepo) ListOccupiedSlots(_ context.Context, fieldID uint, date time.Time) ([]OccupiedSlotRow, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	dateStr := timeutil.StartOfDay(date).Format(timeutil.DateLayout)
	var rows []OccupiedSlotRow
	for _, s := range r.activeSlots {
		if s.FieldID == fieldID && s.SlotDate.Format(timeutil.DateLayout) == dateStr && s.ActiveKey != nil {
			b, ok := r.bookings[s.BookingID]
			if ok && (b.Status == constant.BookingPendingPayment || b.Status == constant.BookingConfirmed || b.Status == constant.BookingCompleted) {
				rows = append(rows, OccupiedSlotRow{StartTime: s.StartTime, Status: b.Status, ExpiresAt: b.ExpiresAt})
			}
		}
	}
	return rows, nil
}

func (r *concurrentMemoryRepo) ListByUser(_ context.Context, userID uint, status string, pageQuery pagination.Query) ([]Booking, int64, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var filtered []Booking
	for _, b := range r.bookings {
		if b.UserID != nil && *b.UserID == userID && (status == "" || string(b.Status) == status) {
			filtered = append(filtered, b)
		}
	}
	total := int64(len(filtered))
	start := pageQuery.Offset()
	if start >= len(filtered) {
		return []Booking{}, total, nil
	}
	end := start + pageQuery.Limit
	if end > len(filtered) {
		end = len(filtered)
	}
	return filtered[start:end], total, nil
}

func (r *concurrentMemoryRepo) FindByIDForUser(_ context.Context, bookingID uint, userID uint) (*Booking, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	b, ok := r.bookings[bookingID]
	if !ok || b.UserID == nil || *b.UserID != userID {
		return nil, nil
	}
	for _, s := range r.activeSlots {
		if s.BookingID == b.ID {
			b.Slots = append(b.Slots, s)
		}
	}
	return &b, nil
}

func (r *concurrentMemoryRepo) FindFieldSummariesByIDs(_ context.Context, fieldIDs []uint) (map[uint]FieldSummaryDTO, error) {
	res := make(map[uint]FieldSummaryDTO, len(fieldIDs))
	for _, id := range fieldIDs {
		res[id] = FieldSummaryDTO{ID: id, Name: "Arena A", Slug: "arena-a", SurfaceType: "Sintetis"}
	}
	return res, nil
}

func (r *concurrentMemoryRepo) UpdateBookingCancellation(_ context.Context, _ uint, _ time.Time, _ string) error {
	return errors.New("must run in tx")
}

func (r *concurrentMemoryRepo) ReleaseBookingSlots(_ context.Context, _ uint) error {
	return errors.New("must run in tx")
}

func (r *concurrentMemoryRepo) FindOverduePendingForUpdate(ctx context.Context, now time.Time, limit int) ([]Booking, error) {
	var items []Booking
	for id, b := range r.bookings {
		if b.Status == constant.BookingPendingPayment && b.ExpiresAt != nil && b.ExpiresAt.Before(now) {
			for _, s := range r.activeSlots {
				if s.BookingID == id {
					b.Slots = append(b.Slots, s)
				}
			}
			items = append(items, b)
			if len(items) >= limit {
				break
			}
		}
	}
	return items, nil
}

func (r *concurrentMemoryRepo) FindFinishedConfirmedForUpdate(_ context.Context, now time.Time, limit int) ([]Booking, error) {
	var items []Booking
	nowWIB := now.In(timeutil.WIB)
	for _, b := range r.bookings {
		if b.Status != constant.BookingConfirmed {
			continue
		}
		endClock, err := timeutil.ParseClock(b.EndTime[:5])
		if err != nil {
			continue
		}
		d := b.BookingDate.In(timeutil.WIB)
		endDT := time.Date(d.Year(), d.Month(), d.Day(), endClock.Hour(), endClock.Minute(), 0, 0, timeutil.WIB)
		if endDT.Before(nowWIB) {
			items = append(items, b)
			if len(items) >= limit {
				break
			}
		}
	}
	return items, nil
}

func (r *concurrentMemoryRepo) FindActivePendingWithSlots(_ context.Context, now time.Time) ([]Booking, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var items []Booking
	for id, b := range r.bookings {
		if b.Status == constant.BookingPendingPayment && b.ExpiresAt != nil && b.ExpiresAt.After(now) {
			for _, s := range r.activeSlots {
				if s.BookingID == id {
					b.Slots = append(b.Slots, s)
				}
			}
			items = append(items, b)
		}
	}
	return items, nil
}

func (r *concurrentMemoryRepo) UpdateBookingStatus(_ context.Context, _ uint, _ constant.BookingStatus) error {
	return errors.New("must run in tx")
}

func (r *concurrentMemoryRepo) FindByID(_ context.Context, bookingID uint) (*Booking, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	b, ok := r.bookings[bookingID]
	if !ok {
		return nil, nil
	}
	for _, s := range r.activeSlots {
		if s.BookingID == b.ID {
			b.Slots = append(b.Slots, s)
		}
	}
	return &b, nil
}

func (r *concurrentMemoryRepo) FindByIDForUpdate(ctx context.Context, bookingID uint) (*Booking, error) {
	return r.FindByID(ctx, bookingID)
}

func (r *concurrentMemoryRepo) DeleteBooking(_ context.Context, bookingID uint) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if b, ok := r.bookings[bookingID]; ok {
		delete(r.codes, b.Code)
		delete(r.bookings, bookingID)
	}
	for k, s := range r.activeSlots {
		if s.BookingID == bookingID {
			delete(r.activeSlots, k)
		}
	}
	return nil
}

type concurrentTxRepo struct {
	parent       *concurrentMemoryRepo
	addedBooking *uint
	addedCode    string
	addedSlots   []string
}

func (t *concurrentTxRepo) RunInTx(ctx context.Context, fn func(txRepo Repository) error) error {
	return fn(t)
}

func (t *concurrentTxRepo) CountPendingByUser(ctx context.Context, userID uint) (int64, error) {
	return t.parent.CountPendingByUser(ctx, userID)
}

func (t *concurrentTxRepo) CreateBooking(_ context.Context, b *Booking) error {
	if t.parent.codes[b.Code] {
		return errors.New("Error 1062 (23000): Duplicate entry for key 'bookings.uq_bookings_code'")
	}
	b.ID = t.parent.nextID
	t.parent.nextID++
	t.parent.codes[b.Code] = true
	t.parent.bookings[b.ID] = *b
	t.addedBooking = &b.ID
	t.addedCode = b.Code
	return nil
}

func (t *concurrentTxRepo) CreateBookingSlots(_ context.Context, slots []BookingSlot) error {
	for _, s := range slots {
		key := fmt.Sprintf("%d|%s|%s", s.FieldID, s.SlotDate.Format(timeutil.DateLayout), s.StartTime)
		if s.ActiveKey != nil {
			if _, exists := t.parent.activeSlots[key]; exists {
				// Simulate transaction rollback of booking & slots inserted in this tx.
				if t.addedBooking != nil {
					delete(t.parent.bookings, *t.addedBooking)
					delete(t.parent.codes, t.addedCode)
				}
				for _, prev := range t.addedSlots {
					delete(t.parent.activeSlots, prev)
				}
				return errors.New("Error 1062 (23000): Duplicate entry for key 'booking_slots.uq_active_slot'")
			}
			t.parent.activeSlots[key] = s
			t.addedSlots = append(t.addedSlots, key)
		}
	}
	return nil
}

func (t *concurrentTxRepo) CreateLog(_ context.Context, log *BookingLog) error {
	t.parent.logs = append(t.parent.logs, *log)
	return nil
}

func (t *concurrentTxRepo) ListOccupiedSlots(ctx context.Context, fieldID uint, date time.Time) ([]OccupiedSlotRow, error) {
	return t.parent.ListOccupiedSlots(ctx, fieldID, date)
}

func (t *concurrentTxRepo) ListByUser(ctx context.Context, userID uint, status string, pageQuery pagination.Query) ([]Booking, int64, error) {
	return t.parent.ListByUser(ctx, userID, status, pageQuery)
}

func (t *concurrentTxRepo) FindByIDForUser(ctx context.Context, bookingID uint, userID uint) (*Booking, error) {
	return t.parent.FindByIDForUser(ctx, bookingID, userID)
}

func (t *concurrentTxRepo) FindFieldSummariesByIDs(ctx context.Context, fieldIDs []uint) (map[uint]FieldSummaryDTO, error) {
	return t.parent.FindFieldSummariesByIDs(ctx, fieldIDs)
}

func (t *concurrentTxRepo) UpdateBookingCancellation(_ context.Context, bookingID uint, cancelledAt time.Time, reason string) error {
	b := t.parent.bookings[bookingID]
	b.Status = constant.BookingCancelled
	b.CancelledAt = &cancelledAt
	b.CancelReason = reason
	t.parent.bookings[bookingID] = b
	return nil
}

func (t *concurrentTxRepo) ReleaseBookingSlots(_ context.Context, bookingID uint) error {
	for k, s := range t.parent.activeSlots {
		if s.BookingID == bookingID {
			delete(t.parent.activeSlots, k)
		}
	}
	return nil
}

func (t *concurrentTxRepo) FindOverduePendingForUpdate(ctx context.Context, now time.Time, limit int) ([]Booking, error) {
	return t.parent.FindOverduePendingForUpdate(ctx, now, limit)
}

func (t *concurrentTxRepo) FindFinishedConfirmedForUpdate(ctx context.Context, now time.Time, limit int) ([]Booking, error) {
	return t.parent.FindFinishedConfirmedForUpdate(ctx, now, limit)
}

func (t *concurrentTxRepo) FindActivePendingWithSlots(ctx context.Context, now time.Time) ([]Booking, error) {
	return t.parent.FindActivePendingWithSlots(ctx, now)
}

func (t *concurrentTxRepo) UpdateBookingStatus(_ context.Context, bookingID uint, status constant.BookingStatus) error {
	b := t.parent.bookings[bookingID]
	b.Status = status
	t.parent.bookings[bookingID] = b
	return nil
}

func (t *concurrentTxRepo) FindByID(_ context.Context, bookingID uint) (*Booking, error) {
	b, ok := t.parent.bookings[bookingID]
	if !ok {
		return nil, nil
	}
	for _, s := range t.parent.activeSlots {
		if s.BookingID == b.ID {
			b.Slots = append(b.Slots, s)
		}
	}
	return &b, nil
}

func (t *concurrentTxRepo) FindByIDForUpdate(ctx context.Context, bookingID uint) (*Booking, error) {
	return t.FindByID(ctx, bookingID)
}

func (t *concurrentTxRepo) DeleteBooking(_ context.Context, bookingID uint) error {
	delete(t.parent.bookings, bookingID)
	return nil
}

type stubFieldSchedule struct{}

func (s *stubFieldSchedule) GetScheduleInfo(_ context.Context, fieldID uint, _ uint8) (*FieldAvailabilityInfo, error) {
	return &FieldAvailabilityInfo{
		ID:        fieldID,
		IsActive:  true,
		OpenTime:  "08:00",
		CloseTime: "23:00",
		IsClosed:  false,
		HasHours:  true,
	}, nil
}

type failingGateway struct{}

func (f *failingGateway) CreatePayment(_ context.Context, _ *Booking) (*PaymentStubResult, error) {
	return nil, errors.New("gateway down")
}

func TestCreateOnlineBooking_50ParallelRequests(t *testing.T) {
	repo := newConcurrentMemoryRepo()
	locker := lock.NewMemoryLocker()
	svc := NewService(
		repo,
		&stubFieldSchedule{},
		&stubPriceResolver{prices: map[string]int64{"19:00": 300000}},
		nil,
		locker,
		NewStubPaymentGateway(),
	)
	handler := NewHandler(svc, validator.New())

	tomorrow := timeutil.Now().AddDate(0, 0, 1).Format(timeutil.DateLayout)
	payload := fmt.Sprintf(`{"field_id":1,"date":"%s","slots":[{"start_time":"19:00","end_time":"20:00"}]}`, tomorrow)

	const workers = 50
	startGate := make(chan struct{})
	var wg sync.WaitGroup
	statuses := make(chan int, workers)

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(uid uint) {
			defer wg.Done()
			<-startGate

			req := httptest.NewRequest(http.MethodPost, "/api/v1/bookings", bytes.NewBufferString(payload))
			req.Header.Set("Content-Type", "application/json")
			ctx := context.WithValue(req.Context(), constant.ContextUserID, uid)
			req = req.WithContext(ctx)

			rec := httptest.NewRecorder()
			handler.CreateOnlineBooking(rec, req)
			statuses <- rec.Code
		}(uint(i + 1))
	}

	close(startGate)
	wg.Wait()
	close(statuses)

	var createdCount, conflictCount, otherCount int
	for code := range statuses {
		switch code {
		case http.StatusCreated:
			createdCount++
		case http.StatusConflict:
			conflictCount++
		default:
			otherCount++
		}
	}

	if createdCount != 1 || conflictCount != workers-1 || otherCount != 0 {
		t.Fatalf("expected 1x 201 and 49x 409, got 201=%d 409=%d other=%d", createdCount, conflictCount, otherCount)
	}
	if len(repo.activeSlots) != 1 {
		t.Fatalf("expected exactly 1 active booking_slot, got %d", len(repo.activeSlots))
	}
	if len(repo.bookings) != 1 {
		t.Fatalf("expected exactly 1 booking, got %d", len(repo.bookings))
	}
}

func TestCreateOnlineBooking_ReleasesLockOnFailure(t *testing.T) {
	repo := newConcurrentMemoryRepo()
	locker := lock.NewMemoryLocker()
	svc := NewService(
		repo,
		&stubFieldSchedule{},
		&stubPriceResolver{prices: map[string]int64{"19:00": 300000}},
		nil,
		locker,
		&failingGateway{},
	)

	tomorrow := timeutil.Now().AddDate(0, 0, 1).Format(timeutil.DateLayout)
	_, err := svc.CreateOnlineBooking(context.Background(), 1, CreateBookingRequest{
		FieldID: 1,
		Date:    tomorrow,
		Slots:   []SlotInput{{StartTime: "19:00", EndTime: "20:00"}},
	})
	if !errors.Is(err, ErrPaymentFailed) {
		t.Fatalf("expected ErrPaymentFailed, got %v", err)
	}

	// Verify lock was released by compensation defer so another acquire succeeds immediately.
	key := constant.SlotLockKey(1, tomorrow, "19:00")
	acquired, lockErr := locker.AcquireMany(context.Background(), []string{key}, "probe-token", time.Minute)
	if lockErr != nil || !acquired {
		t.Fatalf("expected lock to be released after failure, acquired=%v err=%v", acquired, lockErr)
	}
}
