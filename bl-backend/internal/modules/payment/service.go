package payment

import (
	"context"
	"encoding/json"
	"log/slog"
	"math"
	"strconv"
	"strings"
	"time"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/cache"
	"sistem-booking/internal/infra/midtrans"
	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/timeutil"
)

const webhookIdemTTL = 24 * time.Hour

// BookingCoordinator decouples payment from booking internals while preserving
// booking's state machine, slot release, Redis lock cleanup, and cache invalidation.
type BookingCoordinator interface {
	FindBookingForPayment(ctx context.Context, bookingID uint) (*BookingPaymentInfo, error)
	ApplyPaymentOutcome(
		ctx context.Context,
		bookingID uint,
		target constant.BookingStatus,
		action string,
		note string,
	) (alreadyFinalConflict bool, err error)
}

type Service interface {
	CreateForBooking(ctx context.Context, bookingID uint, orderID string, amount int64, expiresAt time.Time, customer *midtrans.CustomerDetail) (*SnapPayResponse, error)
	PayBooking(ctx context.Context, userID uint, bookingID uint) (*SnapPayResponse, error)
	CancelGatewayTransaction(ctx context.Context, bookingID uint)
	HandleWebhook(ctx context.Context, rawBody []byte, payload midtrans.NotificationPayload) error
	SyncBookingPayment(ctx context.Context, userID uint, isAdmin bool, bookingID uint) (*SyncPaymentResponse, error)
	CheckAndSyncBeforeExpire(ctx context.Context, bookingID uint) (confirmed bool, err error)
	CreateRefundForBooking(ctx context.Context, bookingID uint, amount int64, reason string) error
	GetRefundStatusByBooking(ctx context.Context, bookingID uint) (*RefundRequest, error)
	CreateOfflinePayment(ctx context.Context, bookingID, adminID uint, totalAmount int64, method, status string, amountPaid int64, note string) error
	RecordAdminPayment(ctx context.Context, bookingID, adminID uint, totalAmount, amount int64, method, note string) (*AdminPaymentResult, error)
	ListAdminTransactions(ctx context.Context, filter AdminTransactionFilter) (*PaginatedAdminTransactionsResponse, error)
	GetAdminTransactionDetail(ctx context.Context, id uint) (*AdminTransactionDetailResponse, error)
	ListAdminRefunds(ctx context.Context, filter AdminRefundFilter) (*PaginatedAdminRefundsResponse, error)
	ProcessAdminRefund(ctx context.Context, adminID, refundID uint, req AdminProcessRefundRequest) (*RefundRequest, error)
}

type service struct {
	repo     Repository
	gateway  midtrans.Gateway
	bookings BookingCoordinator
	cache    cache.Cache
	logger   *slog.Logger
	now      func() time.Time
}

func NewService(
	repo Repository,
	gateway midtrans.Gateway,
	bookings BookingCoordinator,
	c cache.Cache,
	logger *slog.Logger,
) Service {
	if logger == nil {
		logger = slog.Default()
	}
	return &service{
		repo:     repo,
		gateway:  gateway,
		bookings: bookings,
		cache:    c,
		logger:   logger,
		now:      timeutil.Now,
	}
}

func (s *service) CreateForBooking(
	ctx context.Context,
	bookingID uint,
	orderID string,
	amount int64,
	expiresAt time.Time,
	customer *midtrans.CustomerDetail,
) (*SnapPayResponse, error) {
	p := &Payment{
		BookingID: bookingID,
		OrderID:   orderID,
		Method:    "midtrans",
		Amount:    amount,
		Status:    constant.PaymentPending,
	}
	if err := s.repo.CreatePayment(ctx, p); err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mencatat data pembayaran", err)
	}

	snapRes, err := s.gateway.CreateSnapTransaction(ctx, midtrans.SnapRequest{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:     orderID,
			GrossAmount: amount,
		},
		CustomerDetails: customer,
		ExpiresAt:       expiresAt,
	})
	if err != nil {
		return nil, ErrPaymentGateway
	}

	if err := s.repo.UpdatePaymentSnap(ctx, p.ID, snapRes.Token, snapRes.RedirectURL); err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal menyimpan token pembayaran", err)
	}

	return &SnapPayResponse{
		OrderID:     orderID,
		SnapToken:   snapRes.Token,
		RedirectURL: snapRes.RedirectURL,
		ExpiresAt:   &expiresAt,
	}, nil
}

func (s *service) PayBooking(ctx context.Context, userID uint, bookingID uint) (*SnapPayResponse, error) {
	info, err := s.bookings.FindBookingForPayment(ctx, bookingID)
	if err != nil {
		return nil, err
	}
	if info == nil || info.UserID == nil || *info.UserID != userID {
		return nil, ErrPaymentNotFound
	}
	if info.Status != constant.BookingPendingPayment {
		return nil, ErrPaymentNotPending
	}
	if info.ExpiresAt != nil && !info.ExpiresAt.After(s.now()) {
		return nil, ErrPaymentExpired
	}

	p, err := s.repo.FindByBookingID(ctx, bookingID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil data pembayaran", err)
	}
	if p != nil && p.SnapToken != "" {
		return &SnapPayResponse{
			OrderID:     p.OrderID,
			SnapToken:   p.SnapToken,
			RedirectURL: p.SnapRedirectURL,
			ExpiresAt:   info.ExpiresAt,
		}, nil
	}

	exp := s.now().Add(15 * time.Minute)
	if info.ExpiresAt != nil {
		exp = *info.ExpiresAt
	}
	return s.CreateForBooking(ctx, bookingID, info.Code, info.TotalAmount, exp, nil)
}

func (s *service) CancelGatewayTransaction(ctx context.Context, bookingID uint) {
	if s.gateway == nil {
		return
	}
	p, err := s.repo.FindByBookingID(ctx, bookingID)
	if err != nil || p == nil || p.OrderID == "" {
		return
	}
	if err := s.gateway.CancelTransaction(ctx, p.OrderID); err != nil {
		s.logger.Warn("midtrans cancel transaction best-effort failed", "booking_id", bookingID, "order_id", p.OrderID, "error", err)
	}
}

func (s *service) HandleWebhook(ctx context.Context, rawBody []byte, payload midtrans.NotificationPayload) error {
	if !s.gateway.VerifySignature(payload.OrderID, payload.StatusCode, payload.GrossAmount, payload.SignatureKey) {
		s.logger.Warn("midtrans webhook invalid signature", "order_id", payload.OrderID)
		return ErrInvalidSignature
	}

	idemKey := constant.IdemKey(payload.OrderID, payload.TransactionStatus, payload.TransactionID)
	if s.cache != nil {
		if _, hit, err := s.cache.Get(ctx, idemKey); err == nil && hit {
			return nil
		}
	}

	rawJSON := string(rawBody)
	if !json.Valid(rawBody) {
		b, _ := json.Marshal(payload)
		rawJSON = string(b)
	}

	if _, err := s.applyNotification(ctx, payload.OrderID, payload.TransactionStatus, payload.FraudStatus, payload.PaymentType, payload.TransactionID, payload.GrossAmount, rawJSON, "WEBHOOK"); err != nil {
		return err
	}

	if s.cache != nil {
		_ = s.cache.Set(ctx, idemKey, []byte("1"), webhookIdemTTL)
	}
	return nil
}

func (s *service) SyncBookingPayment(ctx context.Context, userID uint, isAdmin bool, bookingID uint) (*SyncPaymentResponse, error) {
	info, err := s.bookings.FindBookingForPayment(ctx, bookingID)
	if err != nil {
		return nil, err
	}
	if info == nil {
		return nil, ErrPaymentNotFound
	}
	if !isAdmin && (info.UserID == nil || *info.UserID != userID) {
		return nil, ErrPaymentNotFound
	}

	p, err := s.repo.FindByBookingID(ctx, bookingID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil pembayaran", err)
	}
	if p == nil {
		return nil, ErrPaymentNotFound
	}

	statusRes, err := s.gateway.GetTransactionStatus(ctx, p.OrderID)
	if err != nil {
		return nil, ErrPaymentGateway
	}

	raw, _ := json.Marshal(statusRes)
	return s.applyNotification(
		ctx,
		statusRes.OrderID,
		statusRes.TransactionStatus,
		statusRes.FraudStatus,
		statusRes.PaymentType,
		statusRes.TransactionID,
		statusRes.GrossAmount,
		string(raw),
		"SYNC_MANUAL",
	)
}

func (s *service) CheckAndSyncBeforeExpire(ctx context.Context, bookingID uint) (bool, error) {
	p, err := s.repo.FindByBookingID(ctx, bookingID)
	if err != nil || p == nil || s.gateway == nil {
		return false, err
	}
	statusRes, err := s.gateway.GetTransactionStatus(ctx, p.OrderID)
	if err != nil {
		return false, nil
	}

	mapped, ok := MapMidtransStatus(statusRes.TransactionStatus, statusRes.FraudStatus)
	if !ok || mapped.PaymentStatus != constant.PaymentPaid {
		return false, nil
	}

	raw, _ := json.Marshal(statusRes)
	res, err := s.applyNotification(
		ctx,
		statusRes.OrderID,
		statusRes.TransactionStatus,
		statusRes.FraudStatus,
		statusRes.PaymentType,
		statusRes.TransactionID,
		statusRes.GrossAmount,
		string(raw),
		"WORKER_SYNC",
	)
	if err != nil {
		return false, err
	}
	return res.BookingStatus == constant.BookingConfirmed, nil
}

func (s *service) CreateRefundForBooking(ctx context.Context, bookingID uint, amount int64, reason string) error {
	if amount <= 0 {
		return nil
	}
	p, err := s.repo.FindByBookingID(ctx, bookingID)
	if err != nil || p == nil {
		return err
	}
	return s.repo.CreateRefundRequest(ctx, &RefundRequest{
		BookingID: bookingID,
		PaymentID: p.ID,
		Amount:    amount,
		Status:    "pending",
		Reason:    reason,
	})
}

func (s *service) GetRefundStatusByBooking(ctx context.Context, bookingID uint) (*RefundRequest, error) {
	return s.repo.FindRefundByBookingID(ctx, bookingID)
}

func (s *service) applyNotification(
	ctx context.Context,
	orderID, txStatus, fraudStatus, channel, txID, grossAmount, rawJSON, sourceEvent string,
) (*SyncPaymentResponse, error) {
	mapped, ok := MapMidtransStatus(txStatus, fraudStatus)
	if !ok {
		return &SyncPaymentResponse{OrderID: orderID}, nil
	}

	var result SyncPaymentResponse
	err := s.repo.RunInTx(ctx, func(txRepo Repository) error {
		p, err := txRepo.FindByOrderIDForUpdate(ctx, orderID)
		if err != nil {
			return apperror.Internal("DB_ERROR", "Gagal mengunci data pembayaran", err)
		}
		if p == nil {
			return ErrPaymentNotFound
		}

		if grossAmount != "" {
			parsedAmount, parseErr := parseGrossAmount(grossAmount)
			if parseErr != nil || parsedAmount != p.Amount {
				return ErrInvalidGrossAmount
			}
		}

		_ = txRepo.CreatePaymentLog(ctx, &PaymentLog{
			PaymentID:  p.ID,
			Event:      sourceEvent + ":" + txStatus,
			RawPayload: rawJSON,
			CreatedAt:  s.now(),
		})

		if !CanTransitionPayment(p.Status, mapped.PaymentStatus) {
			info, _ := s.bookings.FindBookingForPayment(ctx, p.BookingID)
			bStatus := constant.BookingPendingPayment
			if info != nil {
				bStatus = info.Status
			}
			result = SyncPaymentResponse{
				OrderID:       p.OrderID,
				PaymentStatus: p.Status,
				BookingStatus: bStatus,
				NeedsReview:   p.NeedsReview,
			}
			return nil
		}

		var paidAt *time.Time
		finalPaymentStatus := mapped.PaymentStatus
		if mapped.PaymentStatus == constant.PaymentPaid {
			now := s.now()
			paidAt = &now
			if info, infoErr := s.bookings.FindBookingForPayment(ctx, p.BookingID); infoErr == nil && info != nil && p.Amount < info.TotalAmount {
				finalPaymentStatus = constant.PaymentPartial
			}
		}

		conflict, err := s.bookings.ApplyPaymentOutcome(
			ctx,
			p.BookingID,
			mapped.BookingStatus,
			sourceEvent+"_"+strings.ToUpper(txStatus),
			"Pembaruan status dari Midtrans: "+txStatus,
		)
		if err != nil {
			return err
		}

		needsReview := p.NeedsReview
		finalBookingStatus := mapped.BookingStatus
		if conflict && mapped.PaymentStatus == constant.PaymentPaid {
			needsReview = true
			finalBookingStatus = constant.BookingExpired
		}

		if err := txRepo.UpdatePaymentOutcome(ctx, p.ID, finalPaymentStatus, channel, txID, paidAt, needsReview); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal memperbarui status pembayaran", err)
		}

		result = SyncPaymentResponse{
			OrderID:       p.OrderID,
			PaymentStatus: finalPaymentStatus,
			BookingStatus: finalBookingStatus,
			NeedsReview:   needsReview,
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if s.cache != nil {
		_ = s.cache.DeleteByPrefix(ctx, "cache:report:")
	}
	return &result, nil
}

func parseGrossAmount(raw string) (int64, error) {
	f, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil {
		return 0, err
	}
	return int64(math.Round(f)), nil
}
