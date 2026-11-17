package booking

import (
	"context"
	"sync"
	"testing"
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/pkg/timeutil"
)

type adminTestFieldProvider struct{}

func (adminTestFieldProvider) GetScheduleInfo(_ context.Context, fieldID uint, _ uint8) (*FieldAvailabilityInfo, error) {
	return &FieldAvailabilityInfo{
		ID:        fieldID,
		IsActive:  true,
		OpenTime:  "08:00",
		CloseTime: "23:00",
		IsClosed:  false,
		HasHours:  true,
	}, nil
}

type adminTestPriceResolver struct{}

func (adminTestPriceResolver) ResolvePrice(_ context.Context, _ uint, _ time.Time, _ time.Time) (int64, error) {
	return 150000, nil
}

type adminTestSettings struct{}

func (adminTestSettings) GetInt(_ context.Context, _ string, fallback int) int { return fallback }

type adminTestLocker struct {
	mu    sync.Mutex
	locks map[string]string
}

func newAdminTestLocker() *adminTestLocker {
	return &adminTestLocker{locks: make(map[string]string)}
}

func (l *adminTestLocker) AcquireMany(_ context.Context, keys []string, token string, _ time.Duration) (bool, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	for _, k := range keys {
		if _, exists := l.locks[k]; exists {
			return false, nil
		}
	}
	for _, k := range keys {
		l.locks[k] = token
	}
	return true, nil
}

func (l *adminTestLocker) ReleaseMany(_ context.Context, keys []string, token string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	for _, k := range keys {
		if l.locks[k] == token {
			delete(l.locks, k)
		}
	}
	return nil
}

func (l *adminTestLocker) ForceReleaseMany(_ context.Context, keys []string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	for _, k := range keys {
		delete(l.locks, k)
	}
	return nil
}

func TestConcurrentOnlineVsOfflineBookingSameSlot(t *testing.T) {
	repo := newConcurrentMemoryRepo()
	locker := newAdminTestLocker()
	svc := NewService(
		repo,
		adminTestFieldProvider{},
		adminTestPriceResolver{},
		adminTestSettings{},
		locker,
		NewStubPaymentGateway(),
	)

	targetDate := timeutil.StartOfDay(timeutil.Now()).AddDate(0, 0, 2).Format(timeutil.DateLayout)
	slots := []SlotInput{{StartTime: "19:00", EndTime: "20:00"}}

	var (
		wg          sync.WaitGroup
		mu          sync.Mutex
		onlineWins  int
		offlineWins int
	)

	wg.Add(2)
	go func() {
		defer wg.Done()
		_, err := svc.CreateOnlineBooking(context.Background(), 101, CreateBookingRequest{
			FieldID: 1,
			Date:    targetDate,
			Slots:   slots,
		})
		if err == nil {
			mu.Lock()
			onlineWins++
			mu.Unlock()
		}
	}()

	go func() {
		defer wg.Done()
		_, err := svc.CreateOfflineBooking(context.Background(), 1, CreateOfflineBookingRequest{
			FieldID: 1,
			Date:    targetDate,
			Slots:   slots,
			Customer: OfflineCustomerInput{
				GuestName:  "Budi Walk-in",
				GuestPhone: "081234567899",
			},
			Payment: OfflinePaymentInput{
				Method:     "cash",
				Status:     "paid",
				AmountPaid: 150000,
			},
		})
		if err == nil {
			mu.Lock()
			offlineWins++
			mu.Unlock()
		}
	}()

	wg.Wait()

	if onlineWins+offlineWins != 1 {
		t.Fatalf("expected exactly 1 winner between online and offline booking, got online=%d offline=%d", onlineWins, offlineWins)
	}
}

func TestAdminCancelBookingRequiresReasonAndReleasesSlot(t *testing.T) {
	repo := newConcurrentMemoryRepo()
	svc := NewService(
		repo,
		adminTestFieldProvider{},
		adminTestPriceResolver{},
		adminTestSettings{},
		nil,
		NewStubPaymentGateway(),
	)

	targetDate := timeutil.StartOfDay(timeutil.Now()).AddDate(0, 0, 1).Format(timeutil.DateLayout)
	created, err := svc.CreateOfflineBooking(context.Background(), 1, CreateOfflineBookingRequest{
		FieldID: 1,
		Date:    targetDate,
		Slots:   []SlotInput{{StartTime: "10:00", EndTime: "11:00"}},
		Customer: OfflineCustomerInput{
			GuestName:  "Andi",
			GuestPhone: "081111111111",
		},
		Payment: OfflinePaymentInput{
			Method: "cash",
			Status: "paid",
		},
	})
	if err != nil {
		t.Fatalf("CreateOfflineBooking failed: %v", err)
	}

	if _, err := svc.AdminCancelBooking(context.Background(), 1, created.ID, AdminCancelBookingRequest{
		Reason: "no",
	}); err == nil {
		t.Fatalf("expected error for short reason")
	}

	res, err := svc.AdminCancelBooking(context.Background(), 1, created.ID, AdminCancelBookingRequest{
		Reason: "Lapangan dipakai turnamen internal Noel Futsal",
	})
	if err != nil {
		t.Fatalf("AdminCancelBooking failed: %v", err)
	}
	if res.Status != constant.BookingCancelled {
		t.Fatalf("expected CANCELLED, got %s", res.Status)
	}

	occ, err := svc.GetOccupiedSlots(context.Background(), 1, timeutil.StartOfDay(timeutil.Now()).AddDate(0, 0, 1))
	if err != nil {
		t.Fatalf("GetOccupiedSlots failed: %v", err)
	}
	if _, stillOccupied := occ["10:00"]; stillOccupied {
		t.Fatalf("expected slot 10:00 to be released after admin cancel")
	}
}
