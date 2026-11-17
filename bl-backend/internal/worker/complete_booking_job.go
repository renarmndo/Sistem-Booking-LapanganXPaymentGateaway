package worker

import "context"

type CompleteRunner interface {
	CompleteFinishedBookings(ctx context.Context) (int, error)
}

type CompleteBookingJob struct {
	runner CompleteRunner
}

func NewCompleteBookingJob(runner CompleteRunner) *CompleteBookingJob {
	return &CompleteBookingJob{runner: runner}
}

func (j *CompleteBookingJob) Name() string {
	return "complete_booking_job"
}

func (j *CompleteBookingJob) Run(ctx context.Context) error {
	_, err := j.runner.CompleteFinishedBookings(ctx)
	return err
}
