package app

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"sistem-booking/internal/config"
	"sistem-booking/internal/constant"
	"sistem-booking/internal/database"
	"sistem-booking/internal/infra/cache"
	"sistem-booking/internal/infra/email"
	"sistem-booking/internal/infra/lock"
	"sistem-booking/internal/infra/midtrans"
	"sistem-booking/internal/infra/storage"
	"sistem-booking/internal/modules/auth"
	"sistem-booking/internal/modules/booking"
	"sistem-booking/internal/modules/field"
	"sistem-booking/internal/modules/payment"
	"sistem-booking/internal/modules/report"
	"sistem-booking/internal/modules/schedule"
	"sistem-booking/internal/modules/setting"
	"sistem-booking/internal/worker"
	"sistem-booking/pkg/timeutil"
	"sistem-booking/pkg/validator"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func newRouter(db *gorm.DB, redisClient *redis.Client, cfg config.Config, logger *slog.Logger) (http.Handler, *worker.Scheduler) {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", healthHandler(db, redisClient))
	mux.HandleFunc("GET /readyz", healthHandler(db, redisClient))
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	val := validator.New()
	mailer := email.NewSMTPSender(cfg.SMTP)
	authRepo := auth.NewRepository(db)
	authSvc := auth.NewService(authRepo, redisClient, mailer, cfg)
	authHandler := auth.NewHandler(authSvc, val, cfg.JWT.RefreshTTL, cfg.App.Env == "production")
	auth.RegisterRoutes(mux, authHandler, cfg.JWT.Secret)
	auth.RegisterAdminRoutes(mux, authHandler, cfg.JWT.Secret)

	localStore := storage.NewLocalStorage("uploads", "/uploads")
	redisCache := cache.NewRedisCache(redisClient)
	fieldRepo := field.NewRepository(db)
	fieldSvc := field.NewServiceWithDeps(fieldRepo, authSvc, nil, localStore, redisCache)
	fieldHandler := field.NewHandler(fieldSvc, val)
	field.RegisterPublicRoutes(mux, fieldHandler)
	field.RegisterAdminRoutes(mux, fieldHandler, cfg.JWT.Secret)

	settingRepo := setting.NewRepository(db)
	settingSvc := setting.NewService(settingRepo, redisCache)

	fieldAdapter := &scheduleFieldAdapter{fields: fieldSvc}
	slotLocker := lock.NewRedisLocker(redisClient)
	bookingRepo := booking.NewRepository(db)
	paymentRepo := payment.NewRepository(db)

	var midtransGW midtrans.Gateway = midtrans.NewClient(cfg.Midtrans)
	useRealMidtrans := cfg.Midtrans.ServerKey != "" && cfg.Midtrans.ServerKey != "change-me"

	var bookingSvc booking.Service
	bookingCoord := &paymentBookingCoordinator{getSvc: func() booking.Service { return bookingSvc }}
	paymentSvc := payment.NewService(paymentRepo, midtransGW, bookingCoord, redisCache, logger)

	var bookingGW booking.PaymentGateway = booking.NewStubPaymentGateway()
	if useRealMidtrans {
		bookingGW = &bookingPaymentGatewayAdapter{payments: paymentSvc}
	}

	bookingSvc = booking.NewServiceWithCache(
		bookingRepo,
		&bookingFieldAdapter{fields: fieldAdapter},
		fieldAdapter,
		settingSvc,
		slotLocker,
		bookingGW,
		redisCache,
	)
	bookingSvc.SetPaymentHooks(&bookingPaymentHooksAdapter{payments: paymentSvc})

	scheduleSvc := schedule.NewServiceWithCache(
		fieldAdapter,
		settingSvc,
		&bookingOccupancyAdapter{bookings: bookingSvc},
		redisCache,
	)
	scheduleSvc.SetBlockDeps(schedule.NewBlockRepository(db), &bookingConflictAdapter{bookings: bookingSvc})
	bookingSvc.SetBlockChecker(scheduleSvc)
	scheduleHandler := schedule.NewHandler(scheduleSvc, val)
	schedule.RegisterPublicRoutes(mux, scheduleHandler)
	schedule.RegisterAdminRoutes(mux, scheduleHandler, cfg.JWT.Secret)

	bookingHandler := booking.NewHandler(bookingSvc, val)
	booking.RegisterRoutes(mux, bookingHandler, cfg.JWT.Secret)
	booking.RegisterAdminRoutes(mux, bookingHandler, cfg.JWT.Secret)

	paymentHandler := payment.NewHandler(paymentSvc)
	payment.RegisterRoutes(mux, paymentHandler, cfg.JWT.Secret)
	payment.RegisterAdminRoutes(mux, paymentHandler, cfg.JWT.Secret)

	settingHandler := setting.NewHandler(settingSvc)
	setting.RegisterAdminRoutes(mux, settingHandler, cfg.JWT.Secret)

	reportRepo := report.NewRepository(db)
	reportSvc := report.NewService(reportRepo, redisCache)
	reportHandler := report.NewHandler(reportSvc)
	report.RegisterAdminRoutes(mux, reportHandler, cfg.JWT.Secret)
	report.RegisterOwnerRoutes(mux, reportHandler, cfg.JWT.Secret)

	scheduler := worker.NewScheduler(
		time.Minute,
		logger,
		func(ctx context.Context) error {
			_, err := bookingSvc.RecoverPendingLocks(ctx)
			return err
		},
		worker.NewExpireBookingJob(bookingSvc),
		worker.NewCompleteBookingJob(bookingSvc),
	)

	return mux, scheduler
}

type bookingOccupancyAdapter struct {
	bookings booking.Service
}

func (a *bookingOccupancyAdapter) GetOccupiedSlots(ctx context.Context, fieldID uint, date time.Time) (map[string]schedule.SlotStatus, error) {
	raw, err := a.bookings.GetOccupiedSlots(ctx, fieldID, date)
	if err != nil {
		return nil, err
	}
	res := make(map[string]schedule.SlotStatus, len(raw))
	for clock, status := range raw {
		switch status {
		case "booked":
			res[clock] = schedule.SlotBooked
		case "locked":
			res[clock] = schedule.SlotLocked
		}
	}
	return res, nil
}

type paymentBookingCoordinator struct {
	getSvc func() booking.Service
}

func (c *paymentBookingCoordinator) FindBookingForPayment(ctx context.Context, bookingID uint) (*payment.BookingPaymentInfo, error) {
	b, err := c.getSvc().FindBookingByID(ctx, bookingID)
	if err != nil || b == nil {
		return nil, err
	}
	return &payment.BookingPaymentInfo{
		ID:          b.ID,
		Code:        b.Code,
		UserID:      b.UserID,
		FieldID:     b.FieldID,
		BookingDate: b.BookingDate,
		TotalAmount: b.TotalAmount,
		Status:      b.Status,
		ExpiresAt:   b.ExpiresAt,
	}, nil
}

func (c *paymentBookingCoordinator) ApplyPaymentOutcome(ctx context.Context, bookingID uint, target constant.BookingStatus, action, note string) (bool, error) {
	return c.getSvc().ApplyPaymentOutcome(ctx, bookingID, target, action, note)
}

type bookingPaymentGatewayAdapter struct {
	payments payment.Service
}

func (a *bookingPaymentGatewayAdapter) CreatePayment(ctx context.Context, b *booking.Booking) (*booking.PaymentStubResult, error) {
	exp := time.Now().Add(15 * time.Minute)
	if b.ExpiresAt != nil {
		exp = *b.ExpiresAt
	}
	res, err := a.payments.CreateForBooking(ctx, b.ID, b.Code, b.TotalAmount, exp, nil)
	if err != nil {
		return nil, err
	}
	return &booking.PaymentStubResult{
		Provider:    "midtrans",
		Token:       res.SnapToken,
		RedirectURL: res.RedirectURL,
	}, nil
}

type bookingPaymentHooksAdapter struct {
	payments payment.Service
}

func (a *bookingPaymentHooksAdapter) CancelGatewayTransaction(ctx context.Context, bookingID uint) {
	a.payments.CancelGatewayTransaction(ctx, bookingID)
}

func (a *bookingPaymentHooksAdapter) CheckAndSyncBeforeExpire(ctx context.Context, bookingID uint) (bool, error) {
	return a.payments.CheckAndSyncBeforeExpire(ctx, bookingID)
}

func (a *bookingPaymentHooksAdapter) CreateRefundForBooking(ctx context.Context, bookingID uint, amount int64, reason string) error {
	return a.payments.CreateRefundForBooking(ctx, bookingID, amount, reason)
}

func (a *bookingPaymentHooksAdapter) GetRefundStatus(ctx context.Context, bookingID uint) (*booking.RefundSummaryDTO, error) {
	rr, err := a.payments.GetRefundStatusByBooking(ctx, bookingID)
	if err != nil || rr == nil {
		return nil, err
	}
	return &booking.RefundSummaryDTO{
		Status: rr.Status,
		Amount: rr.Amount,
		Reason: rr.Reason,
	}, nil
}

func (a *bookingPaymentHooksAdapter) CreateOfflinePayment(ctx context.Context, bookingID, adminID uint, totalAmount int64, input booking.OfflinePaymentInput) error {
	return a.payments.CreateOfflinePayment(ctx, bookingID, adminID, totalAmount, input.Method, input.Status, input.AmountPaid, input.Note)
}

func (a *bookingPaymentHooksAdapter) RecordAdminPayment(ctx context.Context, bookingID, adminID uint, totalAmount int64, input booking.AdminPaymentRequest) (*booking.AdminPaymentResponse, error) {
	res, err := a.payments.RecordAdminPayment(ctx, bookingID, adminID, totalAmount, input.Amount, input.Method, input.Note)
	if err != nil {
		return nil, err
	}
	return &booking.AdminPaymentResponse{
		BookingID:     res.BookingID,
		PaymentStatus: res.PaymentStatus,
		PaidTotal:     res.PaidTotal,
		TotalAmount:   res.TotalAmount,
		Remaining:     res.Remaining,
	}, nil
}

type bookingConflictAdapter struct {
	bookings booking.Service
}

func (a *bookingConflictAdapter) FindConflictingBookings(ctx context.Context, fieldID uint, start, end time.Time) ([]schedule.ConflictingBooking, error) {
	rows, err := a.bookings.FindConflictingBookings(ctx, fieldID, start, end)
	if err != nil {
		return nil, err
	}
	res := make([]schedule.ConflictingBooking, 0, len(rows))
	for _, b := range rows {
		res = append(res, schedule.ConflictingBooking{
			ID:          b.ID,
			Code:        b.Code,
			Status:      string(b.Status),
			BookingDate: b.BookingDate.In(timeutil.WIB).Format(timeutil.DateLayout),
			StartTime:   b.StartTime,
			EndTime:     b.EndTime,
		})
	}
	return res, nil
}

type bookingFieldAdapter struct {
	fields *scheduleFieldAdapter
}

func (a *bookingFieldAdapter) GetScheduleInfo(ctx context.Context, fieldID uint, dayOfWeek uint8) (*booking.FieldAvailabilityInfo, error) {
	info, err := a.fields.GetScheduleInfo(ctx, fieldID, dayOfWeek)
	if err != nil {
		return nil, err
	}
	return &booking.FieldAvailabilityInfo{
		ID:        info.ID,
		IsActive:  info.IsActive,
		OpenTime:  info.OpenTime,
		CloseTime: info.CloseTime,
		IsClosed:  info.IsClosed,
		HasHours:  info.HasHours,
	}, nil
}

type scheduleFieldAdapter struct {
	fields field.Service
}

func (a *scheduleFieldAdapter) GetScheduleInfo(ctx context.Context, fieldID uint, dayOfWeek uint8) (*schedule.FieldScheduleInfo, error) {
	detail, err := a.fields.GetPublicByID(ctx, fieldID)
	if err != nil {
		return nil, err
	}
	info := &schedule.FieldScheduleInfo{
		ID:       detail.ID,
		IsActive: detail.IsActive,
	}
	for _, h := range detail.OperatingHours {
		if h.DayOfWeek == dayOfWeek {
			info.HasHours = true
			info.OpenTime = h.OpenTime
			info.CloseTime = h.CloseTime
			info.IsClosed = h.IsClosed
			break
		}
	}
	return info, nil
}

func (a *scheduleFieldAdapter) ResolvePrice(ctx context.Context, fieldID uint, date time.Time, startTime time.Time) (int64, error) {
	return a.fields.ResolvePrice(ctx, fieldID, date, startTime)
}

func healthHandler(db *gorm.DB, redisClient *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		if err := database.PingMySQL(ctx, db); err != nil {
			writeHealthResponse(w, http.StatusServiceUnavailable, "mysql unavailable")
			return
		}
		if err := database.PingRedis(ctx, redisClient); err != nil {
			writeHealthResponse(w, http.StatusServiceUnavailable, "redis unavailable")
			return
		}
		writeHealthResponse(w, http.StatusOK, "ok")
	}
}

func writeHealthResponse(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(`{"status":"` + message + `"}`))
}
