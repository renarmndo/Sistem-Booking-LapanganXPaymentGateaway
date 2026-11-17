package auth

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"sistem-booking/internal/constant"
	"sistem-booking/internal/database"
)

type Repository interface {
	WithTx(tx *gorm.DB) Repository
	RunInTx(ctx context.Context, fn func(repo Repository) error) error

	CreateUser(ctx context.Context, user *User) error
	FindUserByEmail(ctx context.Context, email string) (*User, error)
	FindUserByID(ctx context.Context, id uint) (*User, error)
	MarkUserVerified(ctx context.Context, userID uint, verifiedAt time.Time) error
	UpdateUserProfile(ctx context.Context, userID uint, name, phone string) error
	UpdateUserPassword(ctx context.Context, userID uint, passwordHash string) error

	CreateOTP(ctx context.Context, otp *UserOTP) error
	FindLatestValidOTP(ctx context.Context, email, code string, otpType constant.OTPType, now time.Time) (*UserOTP, error)
	MarkOTPUsed(ctx context.Context, id uint, usedAt time.Time) error
	InvalidateActiveOTPs(ctx context.Context, userID uint, otpType constant.OTPType, usedAt time.Time) error

	CreateRefreshToken(ctx context.Context, rt *RefreshToken) error
	FindRefreshTokenByHash(ctx context.Context, tokenHash string) (*RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, id uint, revokedAt, lastUsedAt time.Time) error
	RevokeRefreshTokenFamily(ctx context.Context, familyID string, revokedAt time.Time) error
	RevokeAllUserRefreshTokens(ctx context.Context, userID uint, revokedAt time.Time) error
}

type gormRepository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &gormRepository{db: db}
}

func (r *gormRepository) WithTx(tx *gorm.DB) Repository {
	return &gormRepository{db: tx}
}

func (r *gormRepository) RunInTx(ctx context.Context, fn func(repo Repository) error) error {
	return database.WithTx(ctx, r.db, func(tx *gorm.DB) error {
		return fn(r.WithTx(tx))
	})
}

func (r *gormRepository) CreateUser(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *gormRepository) FindUserByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	err := r.db.WithContext(ctx).
		Where("email = ? AND deleted_at IS NULL", email).
		First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *gormRepository) FindUserByID(ctx context.Context, id uint) (*User, error) {
	var user User
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *gormRepository) MarkUserVerified(ctx context.Context, userID uint, verifiedAt time.Time) error {
	return r.db.WithContext(ctx).
		Model(&User{}).
		Where("id = ? AND deleted_at IS NULL", userID).
		Updates(map[string]any{
			"verification_status": constant.VerificationVerified,
			"verified_at":         verifiedAt,
		}).Error
}

func (r *gormRepository) UpdateUserProfile(ctx context.Context, userID uint, name, phone string) error {
	return r.db.WithContext(ctx).
		Model(&User{}).
		Where("id = ? AND deleted_at IS NULL", userID).
		Updates(map[string]any{
			"name":  name,
			"phone": phone,
		}).Error
}

func (r *gormRepository) UpdateUserPassword(ctx context.Context, userID uint, passwordHash string) error {
	return r.db.WithContext(ctx).
		Model(&User{}).
		Where("id = ? AND deleted_at IS NULL", userID).
		Updates(map[string]any{
			"password_hash":        passwordHash,
			"must_change_password": false,
			"token_version":        gorm.Expr("token_version + 1"),
		}).Error
}

func (r *gormRepository) CreateOTP(ctx context.Context, otp *UserOTP) error {
	return r.db.WithContext(ctx).Create(otp).Error
}

func (r *gormRepository) FindLatestValidOTP(ctx context.Context, email, code string, otpType constant.OTPType, now time.Time) (*UserOTP, error) {
	var otp UserOTP
	err := r.db.WithContext(ctx).
		Where("email = ? AND otp_code = ? AND type = ? AND used_at IS NULL AND expires_at > ?", email, code, otpType, now).
		Order("id DESC").
		First(&otp).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &otp, nil
}

func (r *gormRepository) MarkOTPUsed(ctx context.Context, id uint, usedAt time.Time) error {
	return r.db.WithContext(ctx).
		Model(&UserOTP{}).
		Where("id = ?", id).
		Update("used_at", usedAt).Error
}

func (r *gormRepository) InvalidateActiveOTPs(ctx context.Context, userID uint, otpType constant.OTPType, usedAt time.Time) error {
	return r.db.WithContext(ctx).
		Model(&UserOTP{}).
		Where("user_id = ? AND type = ? AND used_at IS NULL", userID, otpType).
		Update("used_at", usedAt).Error
}

func (r *gormRepository) CreateRefreshToken(ctx context.Context, rt *RefreshToken) error {
	return r.db.WithContext(ctx).Create(rt).Error
}

func (r *gormRepository) FindRefreshTokenByHash(ctx context.Context, tokenHash string) (*RefreshToken, error) {
	var rt RefreshToken
	err := r.db.WithContext(ctx).
		Where("token_hash = ?", tokenHash).
		First(&rt).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &rt, nil
}

func (r *gormRepository) RevokeRefreshToken(ctx context.Context, id uint, revokedAt, lastUsedAt time.Time) error {
	return r.db.WithContext(ctx).
		Model(&RefreshToken{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"revoked_at":   revokedAt,
			"last_used_at": lastUsedAt,
		}).Error
}

func (r *gormRepository) RevokeRefreshTokenFamily(ctx context.Context, familyID string, revokedAt time.Time) error {
	return r.db.WithContext(ctx).
		Model(&RefreshToken{}).
		Where("family_id = ? AND revoked_at IS NULL", familyID).
		Update("revoked_at", revokedAt).Error
}

func (r *gormRepository) RevokeAllUserRefreshTokens(ctx context.Context, userID uint, revokedAt time.Time) error {
	return r.db.WithContext(ctx).
		Model(&RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", revokedAt).Error
}
