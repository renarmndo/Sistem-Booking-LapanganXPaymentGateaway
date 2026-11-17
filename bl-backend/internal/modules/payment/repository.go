package payment

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"sistem-booking/internal/constant"
	"sistem-booking/internal/database"
)

type Repository interface {
	RunInTx(ctx context.Context, fn func(txRepo Repository) error) error
	CreatePayment(ctx context.Context, p *Payment) error
	UpdatePaymentSnap(ctx context.Context, id uint, snapToken, redirectURL string) error
	FindByBookingID(ctx context.Context, bookingID uint) (*Payment, error)
	FindByOrderIDForUpdate(ctx context.Context, orderID string) (*Payment, error)
	UpdatePaymentOutcome(ctx context.Context, id uint, status constant.PaymentStatus, channel, txID string, paidAt *time.Time, needsReview bool) error
	CreatePaymentLog(ctx context.Context, log *PaymentLog) error
	CreateRefundRequest(ctx context.Context, rr *RefundRequest) error
	FindRefundByBookingID(ctx context.Context, bookingID uint) (*RefundRequest, error)
}

type gormRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &gormRepository{db: db}
}

func (r *gormRepository) RunInTx(ctx context.Context, fn func(txRepo Repository) error) error {
	return database.WithTx(ctx, r.db, func(tx *gorm.DB) error {
		return fn(&gormRepository{db: tx})
	})
}

func (r *gormRepository) CreatePayment(ctx context.Context, p *Payment) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *gormRepository) UpdatePaymentSnap(ctx context.Context, id uint, snapToken, redirectURL string) error {
	return r.db.WithContext(ctx).
		Model(&Payment{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"snap_token":        snapToken,
			"snap_redirect_url": redirectURL,
		}).Error
}

func (r *gormRepository) FindByBookingID(ctx context.Context, bookingID uint) (*Payment, error) {
	var p Payment
	err := r.db.WithContext(ctx).
		Where("booking_id = ?", bookingID).
		Order("id DESC").
		First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *gormRepository) FindByOrderIDForUpdate(ctx context.Context, orderID string) (*Payment, error) {
	var p Payment
	err := r.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("order_id = ?", orderID).
		First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *gormRepository) UpdatePaymentOutcome(
	ctx context.Context,
	id uint,
	status constant.PaymentStatus,
	channel, txID string,
	paidAt *time.Time,
	needsReview bool,
) error {
	updates := map[string]any{
		"status":       status,
		"needs_review": needsReview,
	}
	if channel != "" {
		updates["channel"] = channel
	}
	if txID != "" {
		updates["transaction_id"] = txID
	}
	if paidAt != nil {
		updates["paid_at"] = *paidAt
	}
	return r.db.WithContext(ctx).Model(&Payment{}).Where("id = ?", id).Updates(updates).Error
}

func (r *gormRepository) CreatePaymentLog(ctx context.Context, log *PaymentLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *gormRepository) CreateRefundRequest(ctx context.Context, rr *RefundRequest) error {
	return r.db.WithContext(ctx).Create(rr).Error
}

func (r *gormRepository) FindRefundByBookingID(ctx context.Context, bookingID uint) (*RefundRequest, error) {
	var rr RefundRequest
	err := r.db.WithContext(ctx).
		Where("booking_id = ?", bookingID).
		Order("id DESC").
		First(&rr).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &rr, nil
}
