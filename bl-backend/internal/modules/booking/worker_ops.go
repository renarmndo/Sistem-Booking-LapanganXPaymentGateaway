package booking

import (
	"context"

	"sistem-booking/internal/constant"
	"sistem-booking/pkg/timeutil"
)

const workerBatchSize = 100

// ExpireOverdueBookings transitions overdue PENDING_PAYMENT bookings to EXPIRED,
// releases active_key, deletes Redis locks, and invalidates availability cache.
func (s *service) ExpireOverdueBookings(ctx context.Context) (int, error) {
	now := s.now()
	var expired []Booking

	err := s.repo.RunInTx(ctx, func(txRepo Repository) error {
		candidates, err := txRepo.FindOverduePendingForUpdate(ctx, now, workerBatchSize)
		if err != nil {
			return err
		}
		for i := range candidates {
			b := candidates[i]
			if s.paymentHooks != nil {
				if confirmed, syncErr := s.paymentHooks.CheckAndSyncBeforeExpire(ctx, b.ID); syncErr == nil && confirmed {
					continue
				}
			}
			if _, err := Transition(ctx, &b, constant.BookingExpired, nil, "AUTO_EXPIRE", "Melewati batas waktu pembayaran", txRepo); err != nil {
				return err
			}
			if err := txRepo.UpdateBookingStatus(ctx, b.ID, constant.BookingExpired); err != nil {
				return err
			}
			if err := txRepo.ReleaseBookingSlots(ctx, b.ID); err != nil {
				return err
			}
			expired = append(expired, b)
		}
		return nil
	})
	if err != nil {
		return 0, err
	}

	for _, b := range expired {
		dateStr := b.BookingDate.In(timeutil.WIB).Format(timeutil.DateLayout)
		lockKeys := make([]string, len(b.Slots))
		for i, sl := range b.Slots {
			lockKeys[i] = constant.SlotLockKey(b.FieldID, dateStr, trimClock(sl.StartTime))
		}
		if s.locker != nil && len(lockKeys) > 0 {
			_ = s.locker.ForceReleaseMany(ctx, lockKeys)
		}
		s.invalidateAvailCache(ctx, b.FieldID, dateStr)
	}

	return len(expired), nil
}

// CompleteFinishedBookings transitions CONFIRMED bookings past end_datetime to COMPLETED.
func (s *service) CompleteFinishedBookings(ctx context.Context) (int, error) {
	now := s.now()
	completedCount := 0

	err := s.repo.RunInTx(ctx, func(txRepo Repository) error {
		candidates, err := txRepo.FindFinishedConfirmedForUpdate(ctx, now, workerBatchSize)
		if err != nil {
			return err
		}
		for i := range candidates {
			b := candidates[i]
			if _, err := Transition(ctx, &b, constant.BookingCompleted, nil, "AUTO_COMPLETE", "Sesi bermain selesai", txRepo); err != nil {
				return err
			}
			if err := txRepo.UpdateBookingStatus(ctx, b.ID, constant.BookingCompleted); err != nil {
				return err
			}
			completedCount++
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return completedCount, nil
}

// RecoverPendingLocks reconstructs Redis slot locks on startup for still-valid PENDING_PAYMENT bookings.
func (s *service) RecoverPendingLocks(ctx context.Context) (int, error) {
	if s.locker == nil {
		return 0, nil
	}

	now := s.now()
	activePending, err := s.repo.FindActivePendingWithSlots(ctx, now)
	if err != nil {
		return 0, err
	}

	recovered := 0
	for _, b := range activePending {
		if b.ExpiresAt == nil || len(b.Slots) == 0 {
			continue
		}
		ttl := b.ExpiresAt.Sub(now)
		if ttl <= 0 {
			continue
		}
		dateStr := b.BookingDate.In(timeutil.WIB).Format(timeutil.DateLayout)
		lockKeys := make([]string, len(b.Slots))
		for i, sl := range b.Slots {
			lockKeys[i] = constant.SlotLockKey(b.FieldID, dateStr, trimClock(sl.StartTime))
		}
		if ok, err := s.locker.AcquireMany(ctx, lockKeys, "recovered:"+b.Code, ttl); err == nil && ok {
			recovered++
		}
	}
	return recovered, nil
}
