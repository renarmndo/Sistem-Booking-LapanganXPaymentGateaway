package worker

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

type Job interface {
	Name() string
	Run(ctx context.Context) error
}

type Scheduler struct {
	interval  time.Duration
	jobs      []Job
	startupFn func(ctx context.Context) error
	logger    *slog.Logger

	wg sync.WaitGroup
}

func NewScheduler(interval time.Duration, logger *slog.Logger, startupFn func(ctx context.Context) error, jobs ...Job) *Scheduler {
	if interval <= 0 {
		interval = time.Minute
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &Scheduler{
		interval:  interval,
		jobs:      jobs,
		startupFn: startupFn,
		logger:    logger,
	}
}

func (s *Scheduler) Start(ctx context.Context) {
	if s.startupFn != nil {
		if err := s.startupFn(ctx); err != nil {
			s.logger.Error("worker startup recovery failed", "error", err)
		}
	}

	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		ticker := time.NewTicker(s.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.runOnce(ctx)
			}
		}
	}()
}

func (s *Scheduler) Stop() {
	s.wg.Wait()
}

func (s *Scheduler) runOnce(ctx context.Context) {
	for _, job := range s.jobs {
		if ctx.Err() != nil {
			return
		}
		if err := job.Run(ctx); err != nil {
			s.logger.Error("worker job failed", "job", job.Name(), "error", err)
		}
	}
}
