package worker

import "context"

type ExpireRunner interface {
	ExpireOverdueBookings(ctx context.Context) (int, error)
}

type ExpireBookingJob struct {
	runner ExpireRunner
}

func NewExpireBookingJob(runner ExpireRunner) *ExpireBookingJob {
	return &ExpireBookingJob{runner: runner}
}

func (j *ExpireBookingJob) Name() string {
	return "expire_booking_job"
}

func (j *ExpireBookingJob) Run(ctx context.Context) error {
	_, err := j.runner.ExpireOverdueBookings(ctx)
	return err
}
