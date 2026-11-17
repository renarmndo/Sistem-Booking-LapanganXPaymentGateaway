package booking

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/lock"
	"sistem-booking/pkg/timeutil"
	"sistem-booking/pkg/validator"
)

func TestCreateOnlineBooking_100ParallelRequests(t *testing.T) {
	repo := newConcurrentMemoryRepo()
	locker := lock.NewMemoryLocker()
	svc := NewService(
		repo,
		&stubFieldSchedule{},
		&stubPriceResolver{prices: map[string]int64{"20:00": 300000}},
		nil,
		locker,
		NewStubPaymentGateway(),
	)
	handler := NewHandler(svc, validator.New())

	tomorrow := timeutil.Now().AddDate(0, 0, 1).Format(timeutil.DateLayout)
	payload := fmt.Sprintf(`{"field_id":1,"date":"%s","slots":[{"start_time":"20:00","end_time":"21:00"}]}`, tomorrow)

	const workers = 100
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
			req = req.WithContext(context.WithValue(req.Context(), constant.ContextUserID, uid))

			rec := httptest.NewRecorder()
			handler.CreateOnlineBooking(rec, req)
			statuses <- rec.Code
		}(uint(i + 1))
	}

	close(startGate)
	wg.Wait()
	close(statuses)

	var created, conflicts, others int
	for code := range statuses {
		switch code {
		case http.StatusCreated:
			created++
		case http.StatusConflict:
			conflicts++
		default:
			others++
		}
	}

	if created != 1 || conflicts != workers-1 || others != 0 {
		t.Fatalf("expected 1x 201 and 99x 409, got 201=%d 409=%d other=%d", created, conflicts, others)
	}
	if len(repo.activeSlots) != 1 {
		t.Fatalf("expected 1 active slot, got %d", len(repo.activeSlots))
	}
}

func TestRedisLoss_DBConstraintPreventsDoubleBooking(t *testing.T) {
	repo := newConcurrentMemoryRepo()
	// nil locker simulates Redis unavailable/restarted
	svc := NewService(
		repo,
		&stubFieldSchedule{},
		&stubPriceResolver{prices: map[string]int64{"21:00": 300000}},
		nil,
		nil,
		NewStubPaymentGateway(),
	)

	tomorrow := timeutil.Now().AddDate(0, 0, 1).Format(timeutil.DateLayout)
	const workers = 20
	startGate := make(chan struct{})
	var wg sync.WaitGroup
	results := make(chan error, workers)

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(uid uint) {
			defer wg.Done()
			<-startGate
			_, err := svc.CreateOnlineBooking(context.Background(), uid, CreateBookingRequest{
				FieldID: 1,
				Date:    tomorrow,
				Slots:   []SlotInput{{StartTime: "21:00", EndTime: "22:00"}},
			})
			results <- err
		}(uint(i + 1))
	}

	close(startGate)
	wg.Wait()
	close(results)

	var successCount, slotTakenCount int
	for err := range results {
		if err == nil {
			successCount++
		} else {
			slotTakenCount++
		}
	}

	if successCount != 1 || slotTakenCount != workers-1 {
		t.Fatalf("expected 1 success and %d conflicts without Redis, got ok=%d err=%d", workers-1, successCount, slotTakenCount)
	}
}

func TestTTL_LockExpiresAndBookingExpires(t *testing.T) {
	locker := lock.NewMemoryLocker()
	key := constant.SlotLockKey(1, "2026-12-01", "18:00")

	ok, err := locker.AcquireMany(context.Background(), []string{key}, "tok-1", 30*time.Millisecond)
	if err != nil || !ok {
		t.Fatalf("expected initial lock acquire to succeed")
	}

	okImmediate, _ := locker.AcquireMany(context.Background(), []string{key}, "tok-2", 30*time.Millisecond)
	if okImmediate {
		t.Fatalf("expected concurrent acquire before TTL expiry to fail")
	}

	time.Sleep(45 * time.Millisecond)

	okAfterTTL, _ := locker.AcquireMany(context.Background(), []string{key}, "tok-2", time.Minute)
	if !okAfterTTL {
		t.Fatalf("expected lock to be acquirable after TTL expiry")
	}
}
