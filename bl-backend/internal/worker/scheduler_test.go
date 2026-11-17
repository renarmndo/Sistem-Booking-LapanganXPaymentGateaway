package worker

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

type stubExpireRunner struct {
	runs atomic.Int32
}

func (s *stubExpireRunner) ExpireOverdueBookings(_ context.Context) (int, error) {
	s.runs.Add(1)
	return 1, nil
}

func TestSchedulerRunsStartupAndTickerAndStopsCleanly(t *testing.T) {
	var recovered atomic.Bool
	exp := &stubExpireRunner{}

	sched := NewScheduler(
		15*time.Millisecond,
		nil,
		func(_ context.Context) error {
			recovered.Store(true)
			return nil
		},
		NewExpireBookingJob(exp),
	)

	ctx, cancel := context.WithCancel(context.Background())
	sched.Start(ctx)

	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		if exp.runs.Load() >= 2 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	cancel()
	sched.Stop()

	if !recovered.Load() {
		t.Fatalf("expected startup recovery to run")
	}
	if exp.runs.Load() < 1 {
		t.Fatalf("expected expire job to run at least once, got %d", exp.runs.Load())
	}
}
