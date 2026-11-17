package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"sistem-booking/internal/config"
	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/email"
	"sistem-booking/pkg/apperror"
	"sistem-booking/pkg/hash"
	"sistem-booking/pkg/random"
	"sistem-booking/pkg/token"
)

const (
	otpLength            = 6
	refreshTokenBytes    = 32
	loginFailLimit       = 5
	loginFailWindow      = 15 * time.Minute
	otpVerifyLimit       = 5
	otpVerifyWindow      = 5 * time.Minute
	otpResendWindow      = time.Hour
	defaultOTPTTL        = 15 * time.Minute
	defaultResendLimit   = 3
	dummyBcryptCost12Str = "$2a$12$KIXQ4x5P9z3m6Y1w7v8uOeJ2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e"
)

type ClientMeta struct {
	IP        string
	UserAgent string
}

type AuthResult struct {
	Response     AuthResponse
	RefreshToken string
}

type Service interface {
	Register(ctx context.Context, req RegisterRequest) (*UserResponse, error)
	VerifyOTP(ctx context.Context, req VerifyOTPRequest) error
	ResendOTP(ctx context.Context, req ResendOTPRequest) error
	Login(ctx context.Context, req LoginRequest, meta ClientMeta) (*AuthResult, error)
	Refresh(ctx context.Context, rawRefreshToken string, meta ClientMeta) (*AuthResult, error)
	Logout(ctx context.Context, rawRefreshToken string) error
	Me(ctx context.Context, userID uint) (*UserResponse, error)
	UpdateProfile(ctx context.Context, userID uint, req UpdateProfileRequest) (*UserResponse, error)
	ChangePassword(ctx context.Context, userID uint, req ChangePasswordRequest) error
	IsOwnerUser(ctx context.Context, userID uint) (bool, error)
	DefaultOwnerID(ctx context.Context) (uint, error)
	ListAdminUsers(ctx context.Context, filter AdminUserFilter) (*PaginatedAdminUsersResponse, error)
	GetAdminUserDetail(ctx context.Context, userID uint) (*AdminUserSummaryResponse, error)
	CreateAdminUser(ctx context.Context, req AdminCreateUserRequest) (*UserResponse, error)
	UpdateAdminUser(ctx context.Context, actorAdminID, targetUserID uint, req AdminUpdateUserRequest) (*UserResponse, error)
	ResetAdminUserPassword(ctx context.Context, targetUserID uint, newPassword string) error
}

type RateLimiter interface {
	IsExceeded(ctx context.Context, key string, limit int) (bool, error)
	Increment(ctx context.Context, key string, window time.Duration) error
	Clear(ctx context.Context, key string)
}

type redisLimiter struct {
	rdb *redis.Client
}

func (l *redisLimiter) IsExceeded(ctx context.Context, key string, limit int) (bool, error) {
	if l.rdb == nil || limit <= 0 {
		return false, nil
	}
	count, err := l.rdb.Get(ctx, key).Int64()
	if errors.Is(err, redis.Nil) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return count >= int64(limit), nil
}

func (l *redisLimiter) Increment(ctx context.Context, key string, window time.Duration) error {
	if l.rdb == nil {
		return nil
	}
	count, err := l.rdb.Incr(ctx, key).Result()
	if err != nil {
		return err
	}
	if count == 1 {
		return l.rdb.Expire(ctx, key, window).Err()
	}
	return nil
}

func (l *redisLimiter) Clear(ctx context.Context, key string) {
	if l.rdb == nil {
		return
	}
	_ = l.rdb.Del(ctx, key).Err()
}

type service struct {
	repo    Repository
	limiter RateLimiter
	mailer  email.Sender
	cfg     config.Config
	now     func() time.Time
}

func NewService(repo Repository, rdb *redis.Client, mailer email.Sender, cfg config.Config) Service {
	return NewServiceWithLimiter(repo, &redisLimiter{rdb: rdb}, mailer, cfg)
}

func NewServiceWithLimiter(repo Repository, limiter RateLimiter, mailer email.Sender, cfg config.Config) Service {
	return &service{
		repo:    repo,
		limiter: limiter,
		mailer:  mailer,
		cfg:     cfg,
		now:     time.Now,
	}
}

func (s *service) Register(ctx context.Context, req RegisterRequest) (*UserResponse, error) {
	emailAddr := normalizeEmail(req.Email)
	name := strings.TrimSpace(req.Name)
	phone := strings.TrimSpace(req.Phone)

	existing, err := s.repo.FindUserByEmail(ctx, emailAddr)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa data pengguna", err)
	}
	if existing != nil {
		return nil, ErrEmailExists
	}

	passwordHash, err := hash.Hash(req.Password)
	if err != nil {
		return nil, apperror.Internal("HASH_ERROR", "Gagal memproses kata sandi", err)
	}

	otpCode, err := random.GenerateOTP(otpLength)
	if err != nil {
		return nil, apperror.Internal("OTP_ERROR", "Gagal membuat kode OTP", err)
	}

	now := s.now()
	otpTTL := s.otpTTL()
	user := &User{
		Name:               name,
		Email:              emailAddr,
		Phone:              phone,
		PasswordHash:       passwordHash,
		Role:               constant.RoleUser,
		IsActive:           true,
		VerificationStatus: constant.VerificationUnverified,
		TokenVersion:       1,
	}

	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if err := txRepo.CreateUser(ctx, user); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menyimpan data pengguna", err)
		}
		otp := &UserOTP{
			UserID:    user.ID,
			Email:     user.Email,
			OTPCode:   otpCode,
			Type:      constant.OTPRegistration,
			ExpiresAt: now.Add(otpTTL),
		}
		if err := txRepo.CreateOTP(ctx, otp); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menyimpan kode OTP", err)
		}
		if s.mailer != nil {
			if err := s.mailer.SendOTP(ctx, user.Email, user.Name, otpCode, int(otpTTL.Minutes())); err != nil {
				return apperror.Internal("EMAIL_ERROR", "Gagal mengirim email OTP", err)
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	res := ToUserResponse(user)
	return &res, nil
}

func (s *service) VerifyOTP(ctx context.Context, req VerifyOTPRequest) error {
	emailAddr := normalizeEmail(req.Email)
	attemptKey := constant.OtpAttemptKey(emailAddr)

	if exceeded, err := s.isLimitExceeded(ctx, attemptKey, otpVerifyLimit); err != nil {
		return apperror.Internal("REDIS_ERROR", "Gagal memeriksa batas verifikasi OTP", err)
	} else if exceeded {
		return ErrTooManyOTPVerify
	}

	user, err := s.repo.FindUserByEmail(ctx, emailAddr)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal mencari pengguna", err)
	}
	if user == nil {
		_ = s.incrementLimit(ctx, attemptKey, otpVerifyWindow)
		return ErrInvalidOTP
	}
	if user.VerificationStatus == constant.VerificationVerified {
		return ErrAlreadyVerified
	}

	now := s.now()
	otp, err := s.repo.FindLatestValidOTP(ctx, emailAddr, strings.TrimSpace(req.OTP), constant.OTPRegistration, now)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memeriksa kode OTP", err)
	}
	if otp == nil {
		_ = s.incrementLimit(ctx, attemptKey, otpVerifyWindow)
		return ErrInvalidOTP
	}

	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if err := txRepo.MarkOTPUsed(ctx, otp.ID, now); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal memperbarui status OTP", err)
		}
		if err := txRepo.MarkUserVerified(ctx, user.ID, now); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal memverifikasi akun", err)
		}
		return nil
	})
	if err != nil {
		return err
	}

	s.clearLimit(ctx, attemptKey)
	return nil
}

func (s *service) ResendOTP(ctx context.Context, req ResendOTPRequest) error {
	emailAddr := normalizeEmail(req.Email)
	rateKey := constant.OtpRateLimitKey(emailAddr)

	if exceeded, err := s.isLimitExceeded(ctx, rateKey, s.resendLimit()); err != nil {
		return apperror.Internal("REDIS_ERROR", "Gagal memeriksa batas permintaan OTP", err)
	} else if exceeded {
		return ErrTooManyOTP
	}

	user, err := s.repo.FindUserByEmail(ctx, emailAddr)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal mencari pengguna", err)
	}
	if user == nil {
		return ErrUserNotFound
	}
	if user.VerificationStatus == constant.VerificationVerified {
		return ErrAlreadyVerified
	}

	otpCode, err := random.GenerateOTP(otpLength)
	if err != nil {
		return apperror.Internal("OTP_ERROR", "Gagal membuat kode OTP", err)
	}

	now := s.now()
	otpTTL := s.otpTTL()
	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if err := txRepo.InvalidateActiveOTPs(ctx, user.ID, constant.OTPRegistration, now); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menonaktifkan OTP sebelumnya", err)
		}
		otp := &UserOTP{
			UserID:    user.ID,
			Email:     user.Email,
			OTPCode:   otpCode,
			Type:      constant.OTPRegistration,
			ExpiresAt: now.Add(otpTTL),
		}
		if err := txRepo.CreateOTP(ctx, otp); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menyimpan kode OTP", err)
		}
		if s.mailer != nil {
			if err := s.mailer.SendOTP(ctx, user.Email, user.Name, otpCode, int(otpTTL.Minutes())); err != nil {
				return apperror.Internal("EMAIL_ERROR", "Gagal mengirim email OTP", err)
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	_ = s.incrementLimit(ctx, rateKey, otpResendWindow)
	return nil
}

func (s *service) Login(ctx context.Context, req LoginRequest, meta ClientMeta) (*AuthResult, error) {
	emailAddr := normalizeEmail(req.Email)
	failKey := constant.RateLimitKey("login", meta.IP+":"+emailAddr)

	if exceeded, err := s.isLimitExceeded(ctx, failKey, loginFailLimit); err != nil {
		return nil, apperror.Internal("REDIS_ERROR", "Gagal memeriksa batas percobaan login", err)
	} else if exceeded {
		return nil, ErrTooManyLoginAttempts
	}

	user, err := s.repo.FindUserByEmail(ctx, emailAddr)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa pengguna", err)
	}
	if user == nil {
		// Prevent user enumeration via timing difference.
		_ = hash.Compare(dummyBcryptCost12Str, req.Password)
		_ = s.incrementLimit(ctx, failKey, loginFailWindow)
		return nil, ErrInvalidCredentials
	}

	if err := hash.Compare(user.PasswordHash, req.Password); err != nil {
		_ = s.incrementLimit(ctx, failKey, loginFailWindow)
		return nil, ErrInvalidCredentials
	}

	if !user.IsActive {
		return nil, ErrAccountInactive
	}
	if user.VerificationStatus != constant.VerificationVerified {
		return nil, ErrNotVerified
	}

	s.clearLimit(ctx, failKey)

	familyID, err := random.UUID()
	if err != nil {
		return nil, apperror.Internal("TOKEN_ERROR", "Gagal membuat sesi", err)
	}
	return s.issueTokens(ctx, user, familyID, meta, nil)
}

func (s *service) Refresh(ctx context.Context, rawRefreshToken string, meta ClientMeta) (*AuthResult, error) {
	if strings.TrimSpace(rawRefreshToken) == "" {
		return nil, ErrInvalidRefresh
	}

	tokenHash := hashToken(rawRefreshToken)
	existing, err := s.repo.FindRefreshTokenByHash(ctx, tokenHash)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa refresh token", err)
	}
	if existing == nil {
		return nil, ErrInvalidRefresh
	}

	now := s.now()
	if existing.RevokedAt != nil {
		// Reuse of a revoked refresh token indicates possible theft; revoke the whole family.
		_ = s.repo.RevokeRefreshTokenFamily(ctx, existing.FamilyID, now)
		return nil, ErrInvalidRefresh
	}
	if !existing.ExpiresAt.After(now) {
		return nil, ErrInvalidRefresh
	}

	user, err := s.repo.FindUserByID(ctx, existing.UserID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memeriksa pengguna", err)
	}
	if user == nil || !user.IsActive || user.VerificationStatus != constant.VerificationVerified {
		return nil, ErrInvalidRefresh
	}

	return s.issueTokens(ctx, user, existing.FamilyID, meta, &existing.ID)
}

func (s *service) Logout(ctx context.Context, rawRefreshToken string) error {
	if strings.TrimSpace(rawRefreshToken) == "" {
		return nil
	}
	tokenHash := hashToken(rawRefreshToken)
	existing, err := s.repo.FindRefreshTokenByHash(ctx, tokenHash)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal memeriksa refresh token", err)
	}
	if existing == nil || existing.RevokedAt != nil {
		return nil
	}
	now := s.now()
	if err := s.repo.RevokeRefreshToken(ctx, existing.ID, now, now); err != nil {
		return apperror.Internal("DB_ERROR", "Gagal mencabut refresh token", err)
	}
	return nil
}

func (s *service) Me(ctx context.Context, userID uint) (*UserResponse, error) {
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil profil pengguna", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	res := ToUserResponse(user)
	return &res, nil
}

func (s *service) UpdateProfile(ctx context.Context, userID uint, req UpdateProfileRequest) (*UserResponse, error) {
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal mengambil pengguna", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	name := strings.TrimSpace(req.Name)
	phone := strings.TrimSpace(req.Phone)
	if err := s.repo.UpdateUserProfile(ctx, userID, name, phone); err != nil {
		return nil, apperror.Internal("DB_ERROR", "Gagal memperbarui profil", err)
	}

	user.Name = name
	user.Phone = phone
	res := ToUserResponse(user)
	return &res, nil
}

func (s *service) ChangePassword(ctx context.Context, userID uint, req ChangePasswordRequest) error {
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return apperror.Internal("DB_ERROR", "Gagal mengambil pengguna", err)
	}
	if user == nil {
		return ErrUserNotFound
	}

	if err := hash.Compare(user.PasswordHash, req.CurrentPassword); err != nil {
		return ErrWrongCurrentPassword
	}

	newHash, err := hash.Hash(req.NewPassword)
	if err != nil {
		return apperror.Internal("HASH_ERROR", "Gagal memproses kata sandi baru", err)
	}

	now := s.now()
	return s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if err := txRepo.UpdateUserPassword(ctx, userID, newHash); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal memperbarui kata sandi", err)
		}
		if err := txRepo.RevokeAllUserRefreshTokens(ctx, userID, now); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal mencabut sesi lama", err)
		}
		return nil
	})
}

func (s *service) IsOwnerUser(ctx context.Context, userID uint) (bool, error) {
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return false, err
	}
	if user == nil || !user.IsActive {
		return false, nil
	}
	return user.Role == constant.RoleOwner, nil
}

func (s *service) DefaultOwnerID(ctx context.Context) (uint, error) {
	return s.repo.FindFirstActiveOwnerID(ctx)
}

func (s *service) issueTokens(ctx context.Context, user *User, familyID string, meta ClientMeta, revokeID *uint) (*AuthResult, error) {
	accessToken, err := token.Generate(user.ID, string(user.Role), s.cfg.JWT.Secret, s.cfg.JWT.AccessTTL)
	if err != nil {
		return nil, apperror.Internal("TOKEN_ERROR", "Gagal membuat access token", err)
	}

	rawRefresh, err := random.Token(refreshTokenBytes)
	if err != nil {
		return nil, apperror.Internal("TOKEN_ERROR", "Gagal membuat refresh token", err)
	}

	now := s.now()
	newRT := &RefreshToken{
		UserID:    user.ID,
		TokenHash: hashToken(rawRefresh),
		FamilyID:  familyID,
		ExpiresAt: now.Add(s.cfg.JWT.RefreshTTL),
		UserAgent: truncate(meta.UserAgent, 512),
		IP:        truncate(meta.IP, 45),
	}

	err = s.repo.RunInTx(ctx, func(txRepo Repository) error {
		if revokeID != nil {
			if err := txRepo.RevokeRefreshToken(ctx, *revokeID, now, now); err != nil {
				return apperror.Internal("DB_ERROR", "Gagal mencabut refresh token lama", err)
			}
		}
		if err := txRepo.CreateRefreshToken(ctx, newRT); err != nil {
			return apperror.Internal("DB_ERROR", "Gagal menyimpan refresh token", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		Response: AuthResponse{
			AccessToken: accessToken,
			ExpiresIn:   int64(s.cfg.JWT.AccessTTL.Seconds()),
			User:        ToUserResponse(user),
		},
		RefreshToken: rawRefresh,
	}, nil
}

func (s *service) isLimitExceeded(ctx context.Context, key string, limit int) (bool, error) {
	if s.limiter == nil || limit <= 0 {
		return false, nil
	}
	exceeded, err := s.limiter.IsExceeded(ctx, key, limit)
	if err != nil && s.cfg.App.Env != "production" {
		return false, nil
	}
	return exceeded, err
}

func (s *service) incrementLimit(ctx context.Context, key string, window time.Duration) error {
	if s.limiter == nil {
		return nil
	}
	return s.limiter.Increment(ctx, key, window)
}

func (s *service) clearLimit(ctx context.Context, key string) {
	if s.limiter == nil {
		return
	}
	s.limiter.Clear(ctx, key)
}

func (s *service) otpTTL() time.Duration {
	if s.cfg.SMTP.OTPTTL > 0 {
		return s.cfg.SMTP.OTPTTL
	}
	return defaultOTPTTL
}

func (s *service) resendLimit() int {
	if s.cfg.SMTP.ResendLimit > 0 {
		return s.cfg.SMTP.ResendLimit
	}
	return defaultResendLimit
}

func normalizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func truncate(value string, maxLen int) string {
	if len(value) <= maxLen {
		return value
	}
	return value[:maxLen]
}
