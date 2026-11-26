package booking

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/lock"
	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/random"
	"sistem-booking/pkg/timeutil"
)

const (
	defaultPaymentTTLMinutes = 15
	defaultMaxPendingPerUser = 3
	maxCodeRetries           = 3
)

// FieldScheduleProvider supplies field active status and operating hours for a weekday.
type FieldScheduleProvider interface {
	GetScheduleInfo(ctx context.Context, fieldID uint, dayOfWeek uint8) (*FieldAvailabilityInfo, error)
}

// SettingsProvider reads dynamic booking settings with fallback defaults.
type SettingsProvider interface {
	GetInt(ctx context.Context, key string, fallback int) int
}

// CacheInvalidator deletes cached availability entries by key prefix.
type CacheInvalidator interface {
	DeleteByPrefix(ctx context.Context, prefix string) error
}

// PaymentHooks integrates payment gateway sync, cancel, and refund requests without circular imports.
type PaymentHooks interface {
	CancelGatewayTransaction(ctx context.Context, bookingID uint)
	CheckAndSyncBeforeExpire(ctx context.Context, bookingID uint) (bool, error)
	CreateRefundForBooking(ctx context.Context, bookingID uint, amount int64, reason string) error
	GetRefundStatus(ctx context.Context, bookingID uint) (*RefundSummaryDTO, error)
}

// OfflinePaymentHooks extends PaymentHooks for offline cash/manual payment recording.
type OfflinePaymentHooks interface {
	CreateOfflinePayment(ctx context.Context, bookingID, adminID uint, totalAmount int64, input OfflinePaymentInput) error
	RecordAdminPayment(ctx context.Context, bookingID, adminID uint, totalAmount int64, input AdminPaymentRequest) (*AdminPaymentResponse, error)
}

// ScheduleBlockChecker checks whether a time range is blocked in schedule_blocks.
type ScheduleBlockChecker interface {
	IsRangeBlocked(ctx context.Context, fieldID uint, start, end time.Time) (bool, error)
}

type Service interface {
	CreateOnlineBooking(ctx context.Context, userID uint, req CreateBookingRequest) (*CreateBookingResponse, error)
	CreateOfflineBooking(ctx context.Context, adminID uint, req CreateOfflineBookingRequest) (*AdminBookingItemResponse, error)
	RecordAdminPayment(ctx context.Context, adminID, bookingID uint, req AdminPaymentRequest) (*AdminPaymentResponse, error)
	ListAdminBookings(ctx context.Context, filter AdminBookingFilter) (*PaginatedAdminBookingsResponse, error)
	GetAdminBookingDetail(ctx context.Context, bookingID uint) (*AdminBookingItemResponse, error)
	AdminCancelBooking(ctx context.Context, adminID, bookingID uint, req AdminCancelBookingRequest) (*CancelBookingResponse, error)
	FindConflictingBookings(ctx context.Context, fieldID uint, start, end time.Time) ([]Booking, error)
	GetOccupiedSlots(ctx context.Context, fieldID uint, date time.Time) (map[string]string, error)
	ListMyBookings(ctx context.Context, userID uint, status string, pageQuery pagination.Query) (*PaginatedBookingsResponse, error)
	GetMyBookingDetail(ctx context.Context, userID uint, bookingID uint) (*BookingDetailResponse, error)
	CancelMyBooking(ctx context.Context, userID uint, bookingID uint, reason string) (*CancelBookingResponse, error)
	ExpireOverdueBookings(ctx context.Context) (int, error)
	CompleteFinishedBookings(ctx context.Context) (int, error)
	RecoverPendingLocks(ctx context.Context) (int, error)
	FindBookingByID(ctx context.Context, bookingID uint) (*Booking, error)
	ApplyPaymentOutcome(ctx context.Context, bookingID uint, target constant.BookingStatus, action, note string) (bool, error)
	SetPaymentHooks(hooks PaymentHooks)
	SetBlockChecker(checker ScheduleBlockChecker)
}

type service struct {
	repo         Repository
	fields       FieldScheduleProvider
	prices       PriceResolver
	settings     SettingsProvider
	locker       lock.Locker
	gateway      PaymentGateway
	cache        CacheInvalidator
	paymentHooks PaymentHooks
	blockChecker ScheduleBlockChecker
	now          func() time.Time
}

func NewService(
	repo Repository,
	fields FieldScheduleProvider,
	prices PriceResolver,
	settings SettingsProvider,
	locker lock.Locker,
	gateway PaymentGateway,
) Service {
	return NewServiceWithCache(repo, fields, prices, settings, locker, gateway, nil)
}

func NewServiceWithCache(
	repo Repository,
	fields FieldScheduleProvider,
	prices PriceResolver,
	settings SettingsProvider,
	locker lock.Locker,
	gateway PaymentGateway,
	cache CacheInvalidator,
) Service {
	return &service{
		repo:     repo,
		fields:   fields,
		prices:   prices,
		settings: settings,
		locker:   locker,
		gateway:  gateway,
		cache:    cache,
		now:      timeutil.Now,
	}
}

func (s *service) CreateOnlineBooking(ctx context.Context, userID uint, req CreateBookingRequest) (*CreateBookingResponse, error) {
	bookingDate, err := timeutil.ParseDate(req.Date)
	if err != nil {
		return nil, ErrInvalidDate
	}

	dayOfWeek := uint8(bookingDate.Weekday())
	fieldInfo, err := s.fields.GetScheduleInfo(ctx, req.FieldID, dayOfWeek)
	if err != nil {
		var appErr *apperror.AppError
		if errors.As(err, &appErr) {
			return nil, err
		}
		return nil, ErrFieldNotFound
	}
	if fieldInfo == nil {
		return nil, ErrFieldNotFound
	}

	validationCfg, paymentTTL, maxPending := s.loadConfig(ctx)
	now := s.now()

	normalizedSlots, err := ValidateBookingRequest(now, bookingDate, req.Slots, *fieldInfo, validationCfg)
	if err != nil {
		return nil, err
	}
	if err := s.checkScheduleBlocked(ctx, req.FieldID, bookingDate, normalizedSlots); err != nil {
		return nil, err
	}

	pricedSlots, totalAmount, err := CalculateSlotsPricing(ctx, s.prices, req.FieldID, bookingDate, normalizedSlots)
	if err != nil {
		return nil, err
	}

	pendingCount, err := s.repo.CountPendingByUser(ctx, userID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa batas booking aktif", err)
	}
	if pendingCount >= int64(maxPending) {
		return nil, ErrPendingLimitExceeded
	}

	dateStr := bookingDate.Format(timeutil.DateLayout)
	lockKeys := make([]string, len(pricedSlots))
	for i, ps := range pricedSlots {
		lockKeys[i] = constant.SlotLockKey(req.FieldID, dateStr, ps.StartTime)
	}

	lockToken, err := random.Token(16)
	if err != nil {
		return nil, apperror.Internal("TOKEN_ERROR", "Gagal membuat kunci slot", err)
	}

	if s.locker != nil {
		acquired, err := s.locker.AcquireMany(ctx, lockKeys, lockToken, paymentTTL)
		if err != nil {
			// Graceful fallback to DB unique constraint when Redis lock is unreachable.
		} else if !acquired {
			return nil, ErrSlotTaken
		}
	}

	succeeded := false
	defer func() {
		if !succeeded && s.locker != nil {
			_ = s.locker.ReleaseMany(context.Background(), lockKeys, lockToken)
		}
	}()

	paymentType := strings.ToLower(strings.TrimSpace(req.PaymentType))
	if paymentType != "dp" {
		paymentType = "full"
	}
	payAmount := totalAmount
	if paymentType == "dp" {
		payAmount = totalAmount / 2
	}

	expiresAt := now.Add(paymentTTL)
	created, err := s.persistBookingWithCodeRetry(ctx, userID, req.FieldID, bookingDate, pricedSlots, totalAmount, expiresAt)
	if err != nil {
		return nil, err
	}
	created.InitialPayAmount = payAmount

	payment, err := s.gateway.CreatePayment(ctx, created)
	if err != nil {
		_ = s.repo.DeleteBooking(context.Background(), created.ID)
		return nil, ErrPaymentFailed
	}

	succeeded = true
	s.invalidateAvailCache(ctx, req.FieldID, dateStr)

	return &CreateBookingResponse{
		BookingID:   created.ID,
		Code:        created.Code,
		Total:       created.TotalAmount,
		PayAmount:   payAmount,
		PaymentType: paymentType,
		ExpiresAt:   expiresAt,
		Payment:     *payment,
	}, nil
}

func (s *service) GetOccupiedSlots(ctx context.Context, fieldID uint, date time.Time) (map[string]string, error) {
	rows, err := s.repo.ListOccupiedSlots(ctx, fieldID, date)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa ketersediaan slot", err)
	}

	now := s.now()
	occupied := make(map[string]string, len(rows))
	for _, row := range rows {
		clock := trimClock(row.StartTime)
		switch row.Status {
		case constant.BookingConfirmed, constant.BookingCompleted:
			occupied[clock] = "booked"
		case constant.BookingPendingPayment:
			if row.ExpiresAt == nil || row.ExpiresAt.After(now) {
				if _, exists := occupied[clock]; !exists {
					occupied[clock] = "locked"
				}
			}
		}
	}
	return occupied, nil
}

func (s *service) ListMyBookings(ctx context.Context, userID uint, status string, pageQuery pagination.Query) (*PaginatedBookingsResponse, error) {
	if pageQuery.Page < 1 || pageQuery.Limit < 1 {
		pageQuery = pagination.Query{Page: 1, Limit: 10}
	}

	items, total, err := s.repo.ListByUser(ctx, userID, status, pageQuery)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil riwayat booking", err)
	}

	fieldIDs := make([]uint, 0, len(items))
	seen := make(map[uint]bool)
	for _, item := range items {
		if !seen[item.FieldID] {
			seen[item.FieldID] = true
			fieldIDs = append(fieldIDs, item.FieldID)
		}
	}

	fieldMap, err := s.repo.FindFieldSummariesByIDs(ctx, fieldIDs)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil ringkasan lapangan", err)
	}

	var paymentsMap map[uint]BookingPaymentSummary
	if adminRepo, ok := s.repo.(AdminRepository); ok {
		bookingIDs := make([]uint, len(items))
		for i, item := range items {
			bookingIDs[i] = item.ID
		}
		paymentsMap, _ = adminRepo.FindPaymentSummariesByBookingIDs(ctx, bookingIDs)
	}

	res := make([]BookingDetailResponse, 0, len(items))
	for _, item := range items {
		detail := toBookingDetailResponse(&item, fieldMap[item.FieldID])
		if p, found := paymentsMap[item.ID]; found {
			detail.Payment = BookingPaymentDTO{
				Provider: p.Provider,
				Status:   p.Status,
				Channel:  p.Channel,
				Amount:   p.Amount,
			}
			detail.PaidAmount = p.PaidAmount
		}
		res = append(res, detail)
	}

	return &PaginatedBookingsResponse{
		Items: res,
		Meta:  pagination.NewMeta(pageQuery, total),
	}, nil
}

func (s *service) GetMyBookingDetail(ctx context.Context, userID uint, bookingID uint) (*BookingDetailResponse, error) {
	item, err := s.repo.FindByIDForUser(ctx, bookingID, userID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil detail booking", err)
	}
	if item == nil {
		return nil, ErrBookingNotFound
	}

	fieldMap, err := s.repo.FindFieldSummariesByIDs(ctx, []uint{item.FieldID})
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil info lapangan", err)
	}

	detail := toBookingDetailResponse(item, fieldMap[item.FieldID])
	if adminRepo, ok := s.repo.(AdminRepository); ok {
		if paymentsMap, pErr := adminRepo.FindPaymentSummariesByBookingIDs(ctx, []uint{item.ID}); pErr == nil {
			if p, found := paymentsMap[item.ID]; found {
				detail.Payment = BookingPaymentDTO{
					Provider: p.Provider,
					Status:   p.Status,
					Channel:  p.Channel,
					Amount:   p.Amount,
				}
				detail.PaidAmount = p.PaidAmount
			}
		}
	}
	return &detail, nil
}

func (s *service) CancelMyBooking(ctx context.Context, userID uint, bookingID uint, reason string) (*CancelBookingResponse, error) {
	item, err := s.repo.FindByIDForUser(ctx, bookingID, userID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil booking", err)
	}
	if item == nil {
		return nil, ErrBookingNotFound
	}

	if item.Status != constant.BookingPendingPayment {
		return nil, apperror.Unprocessable(
			"CANCEL_NOT_ALLOWED",
			"Booking yang sudah dibayar tidak dapat dibatalkan dan tidak ada pengembalian dana",
		)
	}

	now := s.now()
	trimmedReason := strings.TrimSpace(reason)
	logNote := "Dibatalkan oleh user sebelum pembayaran"
	if trimmedReason != "" {
		logNote = fmt.Sprintf("%s: %s", logNote, trimmedReason)
	}

	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if _, err := Transition(ctx, item, constant.BookingCancelled, &userID, "USER_CANCEL", logNote, txRepo); err != nil {
			return err
		}
		if err := txRepo.UpdateBookingCancellation(ctx, item.ID, now, trimmedReason); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal memperbarui status pembatalan", err)
		}
		if err := txRepo.ReleaseBookingSlots(ctx, item.ID); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal melepas slot booking", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	dateStr := item.BookingDate.In(timeutil.WIB).Format(timeutil.DateLayout)
	lockKeys := make([]string, len(item.Slots))
	for i, sl := range item.Slots {
		lockKeys[i] = constant.SlotLockKey(item.FieldID, dateStr, trimClock(sl.StartTime))
	}
	if s.locker != nil && len(lockKeys) > 0 {
		_ = s.locker.ForceReleaseMany(ctx, lockKeys)
	}
	if s.paymentHooks != nil {
		s.paymentHooks.CancelGatewayTransaction(ctx, item.ID)
	}
	s.invalidateAvailCache(ctx, item.FieldID, dateStr)

	return &CancelBookingResponse{
		ID:            item.ID,
		Code:          item.Code,
		Status:        constant.BookingCancelled,
		RefundPercent: 0,
		RefundAmount:  0,
	}, nil
}

func (s *service) SetPaymentHooks(hooks PaymentHooks) {
	s.paymentHooks = hooks
}

func (s *service) FindBookingByID(ctx context.Context, bookingID uint) (*Booking, error) {
	return s.repo.FindByID(ctx, bookingID)
}

func (s *service) ApplyPaymentOutcome(ctx context.Context, bookingID uint, target constant.BookingStatus, action, note string) (bool, error) {
	var updated *Booking
	var conflict bool

	err := s.repo.RunInTx(ctx, func(txRepo Repository) error {
		b, err := txRepo.FindByIDForUpdate(ctx, bookingID)
		if err != nil {
			return apperror.Internal("DB_ERROR", "Gagal mengunci booking", err)
		}
		if b == nil {
			return ErrBookingNotFound
		}
		if b.Status == target {
			updated = b
			return nil
		}
		if !CanTransition(b.Status, target) {
			if b.Status == constant.BookingExpired && target == constant.BookingConfirmed {
				conflict = true
				return nil
			}
			return ErrInvalidTransition
		}

		if _, err := Transition(ctx, b, target, nil, action, note, txRepo); err != nil {
			return err
		}
		if err := txRepo.UpdateBookingStatus(ctx, b.ID, target); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal memperbarui status booking", err)
		}
		if target == constant.BookingCancelled || target == constant.BookingExpired {
			if err := txRepo.ReleaseBookingSlots(ctx, b.ID); err != nil {
				return apperror.Internal("DB_ERROR", "Gagal melepas slot booking", err)
			}
		}
		updated = b
		return nil
	})
	if err != nil {
		return false, err
	}

	if updated != nil && (target == constant.BookingConfirmed || target == constant.BookingCancelled || target == constant.BookingExpired) {
		dateStr := updated.BookingDate.In(timeutil.WIB).Format(timeutil.DateLayout)
		lockKeys := make([]string, len(updated.Slots))
		for i, sl := range updated.Slots {
			lockKeys[i] = constant.SlotLockKey(updated.FieldID, dateStr, trimClock(sl.StartTime))
		}
		if s.locker != nil && len(lockKeys) > 0 {
			_ = s.locker.ForceReleaseMany(ctx, lockKeys)
		}
		s.invalidateAvailCache(ctx, updated.FieldID, dateStr)
	}

	return conflict, nil
}

func (s *service) persistBookingWithCodeRetry(
	ctx context.Context,
	userID uint,
	fieldID uint,
	bookingDate time.Time,
	pricedSlots []PricedSlot,
	totalAmount int64,
	expiresAt time.Time,
) (*Booking, error) {
	var created *Booking
	var lastErr error

	for attempt := 0; attempt < maxCodeRetries; attempt++ {
		code, err := random.BookingCode(s.now())
		if err != nil {
			return nil, apperror.Internal("CODE_ERROR", "Gagal membuat kode booking", err)
		}

		var candidate *Booking
		txErr := s.repo.RunInTx(ctx, func(txRepo Repository) error {
			uid := userID
			exp := expiresAt
			candidate = &Booking{
				Code:        code,
				UserID:      &uid,
				FieldID:     fieldID,
				BookingDate: timeutil.StartOfDay(bookingDate),
				StartTime:   pricedSlots[0].StartTime + ":00",
				EndTime:     pricedSlots[len(pricedSlots)-1].EndTime + ":00",
				TotalAmount: totalAmount,
				Status:      constant.BookingPendingPayment,
				Source:      constant.BookingSourceOnline,
				ExpiresAt:   &exp,
				CreatedBy:   &uid,
			}
			if err := txRepo.CreateBooking(ctx, candidate); err != nil {
				return err
			}

			active := int8(1)
			slotModels := make([]BookingSlot, len(pricedSlots))
			for i, ps := range pricedSlots {
				slotModels[i] = BookingSlot{
					BookingID: candidate.ID,
					FieldID:   fieldID,
					SlotDate:  timeutil.StartOfDay(bookingDate),
					StartTime: ps.StartTime + ":00",
					EndTime:   ps.EndTime + ":00",
					Price:     ps.Price,
					ActiveKey: &active,
				}
			}
			if err := txRepo.CreateBookingSlots(ctx, slotModels); err != nil {
				return err
			}

			return txRepo.CreateLog(ctx, &BookingLog{
				BookingID:  candidate.ID,
				ActorID:    &uid,
				Action:     "CREATE_ONLINE",
				FromStatus: "",
				ToStatus:   string(constant.BookingPendingPayment),
				Note:       "Booking online dibuat, menunggu pembayaran",
				CreatedAt:  s.now(),
			})
		})

		if txErr == nil {
			created = candidate
			break
		}
		if isDuplicateCodeError(txErr) {
			lastErr = txErr
			continue
		}
		if isDuplicateKeyError(txErr) {
			return nil, ErrSlotTaken
		}
		return nil, apperror.Internal("DB_ERROR", "Gagal menyimpan booking", txErr)
	}

	if created == nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal membuat kode booking unik", lastErr)
	}
	return created, nil
}

func (s *service) loadConfig(ctx context.Context) (ValidationConfig, time.Duration, int) {
	if s.settings == nil {
		return ValidationConfig{}, defaultPaymentTTLMinutes * time.Minute, defaultMaxPendingPerUser
	}
	cfg := ValidationConfig{
		MaxDaysAhead:       s.settings.GetInt(ctx, "booking.max_days_ahead", DefaultMaxDaysAhead),
		MaxHoursPerBooking: s.settings.GetInt(ctx, "booking.max_hours_per_booking", DefaultMaxHoursPerBooking),
		SlotMinutes:        s.settings.GetInt(ctx, "booking.slot_minutes", DefaultSlotMinutes),
	}
	ttlMinutes := s.settings.GetInt(ctx, "booking.payment_ttl_minutes", defaultPaymentTTLMinutes)
	maxPending := s.settings.GetInt(ctx, "booking.max_pending_per_user", defaultMaxPendingPerUser)
	return cfg, time.Duration(ttlMinutes) * time.Minute, maxPending
}

func (s *service) invalidateAvailCache(ctx context.Context, fieldID uint, dateStr string) {
	if s.cache != nil {
		_ = s.cache.DeleteByPrefix(ctx, constant.AvailCacheKey(fieldID, dateStr))
	}
}

func toBookingDetailResponse(b *Booking, field FieldSummaryDTO) BookingDetailResponse {
	slots := make([]BookingSlotDTO, len(b.Slots))
	for i, sl := range b.Slots {
		slots[i] = BookingSlotDTO{
			StartTime: trimClock(sl.StartTime),
			EndTime:   trimClock(sl.EndTime),
			Price:     sl.Price,
		}
	}

	payStatus := "pending"
	if b.Status == constant.BookingConfirmed || b.Status == constant.BookingCompleted {
		payStatus = "paid"
	} else if b.Status == constant.BookingCancelled {
		payStatus = "cancelled"
	} else if b.Status == constant.BookingExpired {
		payStatus = "expired"
	}

	return BookingDetailResponse{
		ID:           b.ID,
		Code:         b.Code,
		Field:        field,
		BookingDate:  b.BookingDate.In(timeutil.WIB).Format(timeutil.DateLayout),
		StartTime:    trimClock(b.StartTime),
		EndTime:      trimClock(b.EndTime),
		TotalAmount:  b.TotalAmount,
		Status:       b.Status,
		Source:       b.Source,
		ExpiresAt:    b.ExpiresAt,
		CancelledAt:  b.CancelledAt,
		CancelReason: b.CancelReason,
		Slots:        slots,
		Payment: BookingPaymentDTO{
			Provider: "midtrans_stub",
			Status:   payStatus,
		},
		CreatedAt: b.CreatedAt,
	}
}

func trimClock(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if len(trimmed) >= 5 {
		return trimmed[:5]
	}
	return trimmed
}

func parseKickoff(bookingDate time.Time, startTime string) (time.Time, error) {
	clock, err := timeutil.ParseClock(trimClock(startTime))
	if err != nil {
		return time.Time{}, err
	}
	d := bookingDate.In(timeutil.WIB)
	return time.Date(d.Year(), d.Month(), d.Day(), clock.Hour(), clock.Minute(), 0, 0, timeutil.WIB), nil
}

func (s *service) SetBlockChecker(checker ScheduleBlockChecker) {
	s.blockChecker = checker
}

func (s *service) checkScheduleBlocked(ctx context.Context, fieldID uint, bookingDate time.Time, slots []SlotInput) error {
	if s.blockChecker == nil || len(slots) == 0 {
		return nil
	}
	start, err := parseKickoff(bookingDate, slots[0].StartTime)
	if err != nil {
		return nil
	}
	end, err := parseKickoff(bookingDate, slots[len(slots)-1].EndTime)
	if err != nil {
		return nil
	}
	blocked, err := s.blockChecker.IsRangeBlocked(ctx, fieldID, start, end)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memeriksa blokir jadwal", err)
	}
	if blocked {
		return ErrScheduleBlocked
	}
	return nil
}

func (s *service) CreateOfflineBooking(ctx context.Context, adminID uint, req CreateOfflineBookingRequest) (*AdminBookingItemResponse, error) {
	if req.Customer.UserID == nil && (strings.TrimSpace(req.Customer.GuestName) == "" || strings.TrimSpace(req.Customer.GuestPhone) == "") {
		return nil, ErrCustomerRequired
	}

	bookingDate, err := timeutil.ParseDate(req.Date)
	if err != nil {
		return nil, ErrInvalidDate
	}

	dayOfWeek := uint8(bookingDate.Weekday())
	fieldInfo, err := s.fields.GetScheduleInfo(ctx, req.FieldID, dayOfWeek)
	if err != nil {
		var appErr *apperror.AppError
		if errors.As(err, &appErr) {
			return nil, err
		}
		return nil, ErrFieldNotFound
	}
	if fieldInfo == nil {
		return nil, ErrFieldNotFound
	}

	validationCfg, _, _ := s.loadConfig(ctx)
	now := s.now()
	normalizedSlots, err := ValidateBookingRequest(now, bookingDate, req.Slots, *fieldInfo, validationCfg)
	if err != nil {
		return nil, err
	}
	if err := s.checkScheduleBlocked(ctx, req.FieldID, bookingDate, normalizedSlots); err != nil {
		return nil, err
	}

	pricedSlots, totalAmount, err := CalculateSlotsPricing(ctx, s.prices, req.FieldID, bookingDate, normalizedSlots)
	if err != nil {
		return nil, err
	}

	if req.Payment.Status == string(constant.PaymentPaid) && req.Payment.AmountPaid == 0 {
		req.Payment.AmountPaid = totalAmount
	}
	if req.Payment.AmountPaid > totalAmount {
		return nil, ErrInvalidPaymentAmount
	}
	if req.Payment.Status == string(constant.PaymentPartial) && (req.Payment.AmountPaid <= 0 || req.Payment.AmountPaid >= totalAmount) {
		return nil, ErrInvalidPaymentAmount
	}
	if req.Payment.Status == string(constant.PaymentPaid) && req.Payment.AmountPaid < totalAmount {
		return nil, ErrInvalidPaymentAmount
	}

	dateStr := bookingDate.Format(timeutil.DateLayout)
	lockKeys := make([]string, len(pricedSlots))
	for i, ps := range pricedSlots {
		lockKeys[i] = constant.SlotLockKey(req.FieldID, dateStr, ps.StartTime)
	}

	lockToken, err := random.Token(16)
	if err != nil {
		return nil, apperror.Internal("TOKEN_ERROR", "Gagal membuat kunci slot", err)
	}

	// Short 60s distributed lock to serialize concurrent online/offline booking attempts.
	if s.locker != nil {
		acquired, err := s.locker.AcquireMany(ctx, lockKeys, lockToken, 60*time.Second)
		if err == nil && !acquired {
			return nil, ErrSlotTaken
		}
	}
	defer func() {
		if s.locker != nil {
			_ = s.locker.ReleaseMany(context.Background(), lockKeys, lockToken)
		}
	}()

	var created *Booking
	for attempt := 0; attempt < maxCodeRetries; attempt++ {
		code, err := random.BookingCode(now)
		if err != nil {
			return nil, apperror.Internal("CODE_ERROR", "Gagal membuat kode booking", err)
		}
		candidate := &Booking{
			Code:        code,
			UserID:      req.Customer.UserID,
			GuestName:   strings.TrimSpace(req.Customer.GuestName),
			GuestPhone:  strings.TrimSpace(req.Customer.GuestPhone),
			FieldID:     req.FieldID,
			BookingDate: bookingDate,
			StartTime:   pricedSlots[0].StartTime + ":00",
			EndTime:     pricedSlots[len(pricedSlots)-1].EndTime + ":00",
			TotalAmount: totalAmount,
			Status:      constant.BookingConfirmed,
			Source:      constant.BookingSourceOffline,
			CreatedBy:   &adminID,
		}

		txErr := s.repo.RunInTx(ctx, func(txRepo Repository) error {
			if err := txRepo.CreateBooking(ctx, candidate); err != nil {
				return err
			}
			active := int8(1)
			slotModels := make([]BookingSlot, len(pricedSlots))
			for i, ps := range pricedSlots {
				slotModels[i] = BookingSlot{
					BookingID: candidate.ID,
					FieldID:   req.FieldID,
					SlotDate:  bookingDate,
					StartTime: ps.StartTime + ":00",
					EndTime:   ps.EndTime + ":00",
					Price:     ps.Price,
					ActiveKey: &active,
				}
			}
			if err := txRepo.CreateBookingSlots(ctx, slotModels); err != nil {
				return err
			}
			if err := txRepo.CreateLog(ctx, &BookingLog{
				BookingID:  candidate.ID,
				ActorID:    &adminID,
				Action:     "CREATE_OFFLINE",
				FromStatus: "",
				ToStatus:   string(constant.BookingConfirmed),
				Note:       "Booking offline dibuat oleh petugas Noel Futsal",
			}); err != nil {
				return err
			}
			candidate.Slots = slotModels
			return nil
		})
		if txErr == nil {
			created = candidate
			break
		}
		if isDuplicateCodeError(txErr) {
			continue
		}
		if isDuplicateKeyError(txErr) {
			return nil, ErrSlotTaken
		}
		return nil, apperror.Internal("DB_ERROR", "Gagal menyimpan booking offline", txErr)
	}
	if created == nil {
		return nil, apperror.Internal("CODE_COLLISION", "Gagal membuat kode booking unik", nil)
	}

	if offlineHooks, ok := s.paymentHooks.(OfflinePaymentHooks); ok {
		if err := offlineHooks.CreateOfflinePayment(ctx, created.ID, adminID, created.TotalAmount, req.Payment); err != nil {
			return nil, apperror.Internal("PAYMENT_ERROR", "Booking dibuat tetapi gagal mencatat pembayaran offline", err)
		}
	}

	s.invalidateAvailCache(ctx, req.FieldID, dateStr)
	return s.GetAdminBookingDetail(ctx, created.ID)
}

func (s *service) RecordAdminPayment(ctx context.Context, adminID, bookingID uint, req AdminPaymentRequest) (*AdminPaymentResponse, error) {
	b, err := s.repo.FindByID(ctx, bookingID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa booking", err)
	}
	if b == nil {
		return nil, ErrBookingNotFound
	}
	offlineHooks, ok := s.paymentHooks.(OfflinePaymentHooks)
	if !ok {
		return nil, apperror.Internal("NOT_CONFIGURED", "Payment hooks offline belum tersedia", nil)
	}
	res, err := offlineHooks.RecordAdminPayment(ctx, bookingID, adminID, b.TotalAmount, req)
	if err != nil {
		return nil, err
	}
	_ = s.repo.CreateLog(ctx, &BookingLog{
		BookingID:  bookingID,
		ActorID:    &adminID,
		Action:     "RECORD_PAYMENT",
		FromStatus: string(b.Status),
		ToStatus:   string(b.Status),
		Note:       fmt.Sprintf("Pembayaran %s sebesar %d (%s)", req.Method, req.Amount, res.PaymentStatus),
	})
	return res, nil
}

func (s *service) ListAdminBookings(ctx context.Context, filter AdminBookingFilter) (*PaginatedAdminBookingsResponse, error) {
	adminRepo, ok := s.repo.(AdminRepository)
	if !ok {
		return &PaginatedAdminBookingsResponse{Items: []AdminBookingItemResponse{}}, nil
	}
	rows, total, err := adminRepo.ListAdmin(ctx, filter)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil daftar booking", err)
	}

	fieldIDs := make([]uint, 0, len(rows))
	userIDSet := make(map[uint]struct{})
	bookingIDs := make([]uint, 0, len(rows))
	for _, b := range rows {
		fieldIDs = append(fieldIDs, b.FieldID)
		bookingIDs = append(bookingIDs, b.ID)
		if b.UserID != nil {
			userIDSet[*b.UserID] = struct{}{}
		}
	}
	userIDs := make([]uint, 0, len(userIDSet))
	for uid := range userIDSet {
		userIDs = append(userIDs, uid)
	}

	fieldsMap, _ := s.repo.FindFieldSummariesByIDs(ctx, fieldIDs)
	usersMap, _ := adminRepo.FindUserBasicInfoByIDs(ctx, userIDs)
	paymentsMap, _ := adminRepo.FindPaymentSummariesByBookingIDs(ctx, bookingIDs)

	items := make([]AdminBookingItemResponse, 0, len(rows))
	for _, b := range rows {
		base := toBookingDetailResponse(&b, fieldsMap[b.FieldID])
		custName, custPhone := b.GuestName, b.GuestPhone
		if b.UserID != nil {
			if u, found := usersMap[*b.UserID]; found {
				if custName == "" {
					custName = u.Name
				}
				if custPhone == "" {
					custPhone = u.Phone
				}
			}
		}
		var paidAmt int64
		if p, found := paymentsMap[b.ID]; found {
			base.Payment = BookingPaymentDTO{Provider: p.Provider, Status: p.Status}
			paidAmt = p.PaidAmount
		}
		items = append(items, AdminBookingItemResponse{
			BookingDetailResponse: base,
			UserID:                b.UserID,
			CustomerName:          custName,
			CustomerPhone:         custPhone,
			PaidAmount:            paidAmt,
		})
	}

	return &PaginatedAdminBookingsResponse{
		Items: items,
		Meta:  pagination.NewMeta(filter.Pagination, total),
	}, nil
}

func (s *service) GetAdminBookingDetail(ctx context.Context, bookingID uint) (*AdminBookingItemResponse, error) {
	b, err := s.repo.FindByID(ctx, bookingID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil detail booking", err)
	}
	if b == nil {
		return nil, ErrBookingNotFound
	}
	fieldsMap, _ := s.repo.FindFieldSummariesByIDs(ctx, []uint{b.FieldID})
	base := toBookingDetailResponse(b, fieldsMap[b.FieldID])

	custName, custPhone := b.GuestName, b.GuestPhone
	var logsDTO []BookingLogDTO
	var paidAmt int64

	if adminRepo, ok := s.repo.(AdminRepository); ok {
		if b.UserID != nil {
			if usersMap, err := adminRepo.FindUserBasicInfoByIDs(ctx, []uint{*b.UserID}); err == nil {
				if u, found := usersMap[*b.UserID]; found {
					if custName == "" {
						custName = u.Name
					}
					if custPhone == "" {
						custPhone = u.Phone
					}
				}
			}
		}
		if paymentsMap, err := adminRepo.FindPaymentSummariesByBookingIDs(ctx, []uint{b.ID}); err == nil {
			if p, found := paymentsMap[b.ID]; found {
				base.Payment = BookingPaymentDTO{Provider: p.Provider, Status: p.Status}
				paidAmt = p.PaidAmount
			}
		}
		if logs, err := adminRepo.FindLogsByBookingID(ctx, b.ID); err == nil {
			for _, l := range logs {
				logsDTO = append(logsDTO, BookingLogDTO{
					ID:         l.ID,
					ActorID:    l.ActorID,
					Action:     l.Action,
					FromStatus: l.FromStatus,
					ToStatus:   l.ToStatus,
					Note:       l.Note,
					CreatedAt:  l.CreatedAt,
				})
			}
		}
	}

	if s.paymentHooks != nil {
		if ref, err := s.paymentHooks.GetRefundStatus(ctx, b.ID); err == nil && ref != nil {
			base.Refund = ref
		}
	}

	return &AdminBookingItemResponse{
		BookingDetailResponse: base,
		UserID:                b.UserID,
		CustomerName:          custName,
		CustomerPhone:         custPhone,
		PaidAmount:            paidAmt,
		Logs:                  logsDTO,
	}, nil
}

func (s *service) AdminCancelBooking(ctx context.Context, adminID, bookingID uint, req AdminCancelBookingRequest) (*CancelBookingResponse, error) {
	reason := strings.TrimSpace(req.Reason)
	if len(reason) < 3 {
		return nil, ErrCancelReasonRequired
	}
	b, err := s.repo.FindByID(ctx, bookingID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa booking", err)
	}
	if b == nil {
		return nil, ErrBookingNotFound
	}
	if !CanTransition(b.Status, constant.BookingCancelled) {
		return nil, ErrInvalidTransition
	}

	now := s.now()
	var refundAmt int64
	if req.CreateRefund {
		refundAmt = req.RefundAmount
		if refundAmt == 0 {
			refundAmt = b.TotalAmount
		}
	}

	prevStatus := b.Status
	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if _, err := Transition(ctx, b, constant.BookingCancelled, &adminID, "ADMIN_CANCEL", reason, txRepo); err != nil {
			return err
		}
		if err := txRepo.UpdateBookingCancellation(ctx, b.ID, now, reason); err != nil {
			return err
		}
		return txRepo.ReleaseBookingSlots(ctx, b.ID)
	})
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal membatalkan booking", err)
	}

	dateStr := b.BookingDate.In(timeutil.WIB).Format(timeutil.DateLayout)
	lockKeys := make([]string, len(b.Slots))
	for i, sl := range b.Slots {
		lockKeys[i] = constant.SlotLockKey(b.FieldID, dateStr, trimClock(sl.StartTime))
	}
	if s.locker != nil && len(lockKeys) > 0 {
		_ = s.locker.ForceReleaseMany(ctx, lockKeys)
	}
	s.invalidateAvailCache(ctx, b.FieldID, dateStr)

	if s.paymentHooks != nil {
		if prevStatus == constant.BookingPendingPayment {
			s.paymentHooks.CancelGatewayTransaction(ctx, b.ID)
		} else if req.CreateRefund && refundAmt > 0 {
			_ = s.paymentHooks.CreateRefundForBooking(ctx, b.ID, refundAmt, reason)
		}
	}

	return &CancelBookingResponse{
		ID:            b.ID,
		Code:          b.Code,
		Status:        constant.BookingCancelled,
		RefundPercent: 100,
		RefundAmount:  refundAmt,
	}, nil
}

func (s *service) FindConflictingBookings(ctx context.Context, fieldID uint, start, end time.Time) ([]Booking, error) {
	adminRepo, ok := s.repo.(AdminRepository)
	if !ok {
		return nil, nil
	}
	return adminRepo.FindConflictingBookings(ctx, fieldID, start, end)
}
