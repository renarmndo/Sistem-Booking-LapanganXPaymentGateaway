package auth

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"gorm.io/gorm"
	"sistem-booking/internal/config"
	"sistem-booking/internal/constant"
	"sistem-booking/pkg/apperror"
)

type memRepo struct {
	mu            sync.Mutex
	nextUserID    uint
	nextOTPID     uint
	nextTokenID   uint
	users         map[uint]*User
	otps          map[uint]*UserOTP
	refreshTokens map[uint]*RefreshToken
}

func newMemRepo() *memRepo {
	return &memRepo{
		nextUserID:    1,
		nextOTPID:     1,
		nextTokenID:   1,
		users:         make(map[uint]*User),
		otps:          make(map[uint]*UserOTP),
		refreshTokens: make(map[uint]*RefreshToken),
	}
}

func (m *memRepo) WithTx(_ *gorm.DB) Repository { return m }

func (m *memRepo) RunInTx(_ context.Context, fn func(repo Repository) error) error {
	return fn(m)
}

func (m *memRepo) CreateUser(_ context.Context, user *User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	user.ID = m.nextUserID
	m.nextUserID++
	cp := *user
	m.users[user.ID] = &cp
	return nil
}

func (m *memRepo) FindUserByEmail(_ context.Context, email string) (*User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, u := range m.users {
		if u.Email == email && u.DeletedAt == nil {
			cp := *u
			return &cp, nil
		}
	}
	return nil, nil
}

func (m *memRepo) FindUserByID(_ context.Context, id uint) (*User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, ok := m.users[id]
	if !ok || u.DeletedAt != nil {
		return nil, nil
	}
	cp := *u
	return &cp, nil
}

func (m *memRepo) MarkUserVerified(_ context.Context, userID uint, verifiedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.users[userID]; ok {
		u.VerificationStatus = constant.VerificationVerified
		t := verifiedAt
		u.VerifiedAt = &t
	}
	return nil
}

func (m *memRepo) UpdateUserProfile(_ context.Context, userID uint, name, phone string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.users[userID]; ok {
		u.Name = name
		u.Phone = phone
	}
	return nil
}

func (m *memRepo) UpdateUserPassword(_ context.Context, userID uint, passwordHash string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.users[userID]; ok {
		u.PasswordHash = passwordHash
		u.MustChangePassword = false
		u.TokenVersion++
	}
	return nil
}

func (m *memRepo) CreateOTP(_ context.Context, otp *UserOTP) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	otp.ID = m.nextOTPID
	m.nextOTPID++
	cp := *otp
	m.otps[otp.ID] = &cp
	return nil
}

func (m *memRepo) FindLatestValidOTP(_ context.Context, email, code string, otpType constant.OTPType, now time.Time) (*UserOTP, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var latest *UserOTP
	for _, o := range m.otps {
		if o.Email == email && o.OTPCode == code && o.Type == otpType && o.UsedAt == nil && o.ExpiresAt.After(now) {
			if latest == nil || o.ID > latest.ID {
				cp := *o
				latest = &cp
			}
		}
	}
	return latest, nil
}

func (m *memRepo) MarkOTPUsed(_ context.Context, id uint, usedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if o, ok := m.otps[id]; ok {
		t := usedAt
		o.UsedAt = &t
	}
	return nil
}

func (m *memRepo) InvalidateActiveOTPs(_ context.Context, userID uint, otpType constant.OTPType, usedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, o := range m.otps {
		if o.UserID == userID && o.Type == otpType && o.UsedAt == nil {
			t := usedAt
			o.UsedAt = &t
		}
	}
	return nil
}

func (m *memRepo) CreateRefreshToken(_ context.Context, rt *RefreshToken) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	rt.ID = m.nextTokenID
	m.nextTokenID++
	cp := *rt
	m.refreshTokens[rt.ID] = &cp
	return nil
}

func (m *memRepo) FindRefreshTokenByHash(_ context.Context, tokenHash string) (*RefreshToken, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, rt := range m.refreshTokens {
		if rt.TokenHash == tokenHash {
			cp := *rt
			return &cp, nil
		}
	}
	return nil, nil
}

func (m *memRepo) RevokeRefreshToken(_ context.Context, id uint, revokedAt, lastUsedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if rt, ok := m.refreshTokens[id]; ok {
		r := revokedAt
		l := lastUsedAt
		rt.RevokedAt = &r
		rt.LastUsedAt = &l
	}
	return nil
}

func (m *memRepo) RevokeRefreshTokenFamily(_ context.Context, familyID string, revokedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, rt := range m.refreshTokens {
		if rt.FamilyID == familyID && rt.RevokedAt == nil {
			r := revokedAt
			rt.RevokedAt = &r
		}
	}
	return nil
}

func (m *memRepo) RevokeAllUserRefreshTokens(_ context.Context, userID uint, revokedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, rt := range m.refreshTokens {
		if rt.UserID == userID && rt.RevokedAt == nil {
			r := revokedAt
			rt.RevokedAt = &r
		}
	}
	return nil
}

type sentMail struct {
	to   string
	name string
	otp  string
	ttl  int
}

type mockMailer struct {
	sent []sentMail
	err  error
}

func (m *mockMailer) SendOTP(_ context.Context, toEmail, recipientName, otpCode string, ttlMinutes int) error {
	if m.err != nil {
		return m.err
	}
	m.sent = append(m.sent, sentMail{to: toEmail, name: recipientName, otp: otpCode, ttl: ttlMinutes})
	return nil
}

type memLimiter struct {
	mu     sync.Mutex
	counts map[string]int64
}

func newMemLimiter() *memLimiter {
	return &memLimiter{counts: make(map[string]int64)}
}

func (l *memLimiter) IsExceeded(_ context.Context, key string, limit int) (bool, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.counts[key] >= int64(limit), nil
}

func (l *memLimiter) Increment(_ context.Context, key string, _ time.Duration) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.counts[key]++
	return nil
}

func (l *memLimiter) Clear(_ context.Context, key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.counts, key)
}

func setupServiceTest(t *testing.T) (*service, *memRepo, *mockMailer) {
	t.Helper()
	repo := newMemRepo()
	mailer := &mockMailer{}
	cfg := config.Config{
		JWT: config.JWTConfig{
			Secret:     "super-secret-jwt-key-with-at-least-32-bytes",
			AccessTTL:  15 * time.Minute,
			RefreshTTL: 7 * 24 * time.Hour,
		},
		SMTP: config.SMTPConfig{
			OTPTTL:      15 * time.Minute,
			ResendLimit: 3,
		},
	}
	svc := NewServiceWithLimiter(repo, newMemLimiter(), mailer, cfg).(*service)
	return svc, repo, mailer
}

func assertAppErrorCode(t *testing.T, err error, wantCode string) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error %s, got nil", wantCode)
	}
	var appErr *apperror.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("expected AppError, got %T: %v", err, err)
	}
	if appErr.Code != wantCode {
		t.Fatalf("expected error code %s, got %s (%s)", wantCode, appErr.Code, appErr.Message)
	}
}

func TestRegisterSuccessAndDuplicate(t *testing.T) {
	svc, _, mailer := setupServiceTest(t)
	ctx := context.Background()

	res, err := svc.Register(ctx, RegisterRequest{
		Name:     "Budi Santoso",
		Email:    "Budi@Example.com",
		Phone:    "081234567890",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if res.Email != "budi@example.com" {
		t.Fatalf("expected normalized email, got %s", res.Email)
	}
	if res.Role != string(constant.RoleUser) {
		t.Fatalf("expected role user, got %s", res.Role)
	}
	if res.VerificationStatus != string(constant.VerificationUnverified) {
		t.Fatalf("expected UNVERIFIED, got %s", res.VerificationStatus)
	}
	if len(mailer.sent) != 1 || len(mailer.sent[0].otp) != 6 {
		t.Fatalf("expected 1 OTP email with 6-digit code, got %+v", mailer.sent)
	}

	_, err = svc.Register(ctx, RegisterRequest{
		Name:     "Budi 2",
		Email:    "budi@example.com",
		Phone:    "081234567891",
		Password: "Password123!",
	})
	assertAppErrorCode(t, err, ErrEmailExists.Code)
}

func TestVerifyOTPValidInvalidExpiredAndRateLimit(t *testing.T) {
	svc, repo, mailer := setupServiceTest(t)
	ctx := context.Background()

	_, err := svc.Register(ctx, RegisterRequest{
		Name:     "Siti",
		Email:    "siti@example.com",
		Phone:    "081234567890",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatal(err)
	}

	// Wrong OTP should fail
	err = svc.VerifyOTP(ctx, VerifyOTPRequest{Email: "siti@example.com", OTP: "000000"})
	assertAppErrorCode(t, err, ErrInvalidOTP.Code)

	// Valid OTP succeeds
	err = svc.VerifyOTP(ctx, VerifyOTPRequest{Email: "siti@example.com", OTP: mailer.sent[0].otp})
	if err != nil {
		t.Fatalf("verify otp failed: %v", err)
	}

	user, _ := repo.FindUserByEmail(ctx, "siti@example.com")
	if user.VerificationStatus != constant.VerificationVerified || user.VerifiedAt == nil {
		t.Fatalf("expected user to be VERIFIED with verified_at, got %+v", user)
	}

	// Second verification attempt returns ErrAlreadyVerified
	err = svc.VerifyOTP(ctx, VerifyOTPRequest{Email: "siti@example.com", OTP: mailer.sent[0].otp})
	assertAppErrorCode(t, err, ErrAlreadyVerified.Code)
}

func TestVerifyOTPExpiredAndAttemptLimit(t *testing.T) {
	svc, _, mailer := setupServiceTest(t)
	ctx := context.Background()

	now := time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)
	svc.now = func() time.Time { return now }

	_, err := svc.Register(ctx, RegisterRequest{
		Name:     "Andi",
		Email:    "andi@example.com",
		Phone:    "081234567890",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatal(err)
	}

	// Advance past 15m TTL
	svc.now = func() time.Time { return now.Add(16 * time.Minute) }
	err = svc.VerifyOTP(ctx, VerifyOTPRequest{Email: "andi@example.com", OTP: mailer.sent[0].otp})
	assertAppErrorCode(t, err, ErrInvalidOTP.Code)

	// 4 more invalid attempts (total 5) then 6th triggers rate limit
	for range 4 {
		err = svc.VerifyOTP(ctx, VerifyOTPRequest{Email: "andi@example.com", OTP: "999999"})
		assertAppErrorCode(t, err, ErrInvalidOTP.Code)
	}
	err = svc.VerifyOTP(ctx, VerifyOTPRequest{Email: "andi@example.com", OTP: "999999"})
	assertAppErrorCode(t, err, ErrTooManyOTPVerify.Code)
}

func TestResendOTPInvalidatesPreviousAndRateLimits(t *testing.T) {
	svc, _, mailer := setupServiceTest(t)
	ctx := context.Background()

	_, err := svc.Register(ctx, RegisterRequest{
		Name:     "Rina",
		Email:    "rina@example.com",
		Phone:    "081234567890",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatal(err)
	}
	firstOTP := mailer.sent[0].otp

	// Resend 1, 2, 3 should succeed
	for i := range 3 {
		if err := svc.ResendOTP(ctx, ResendOTPRequest{Email: "rina@example.com"}); err != nil {
			t.Fatalf("resend %d failed: %v", i+1, err)
		}
	}

	// 4th resend within 1 hour should be rate limited
	err = svc.ResendOTP(ctx, ResendOTPRequest{Email: "rina@example.com"})
	assertAppErrorCode(t, err, ErrTooManyOTP.Code)

	// Old OTP must be invalidated if different from latest
	latestOTP := mailer.sent[len(mailer.sent)-1].otp
	if firstOTP != latestOTP {
		err = svc.VerifyOTP(ctx, VerifyOTPRequest{Email: "rina@example.com", OTP: firstOTP})
		assertAppErrorCode(t, err, ErrInvalidOTP.Code)
	}

	// Latest OTP works
	if err := svc.VerifyOTP(ctx, VerifyOTPRequest{Email: "rina@example.com", OTP: latestOTP}); err != nil {
		t.Fatalf("expected latest OTP to succeed, got %v", err)
	}
}

func TestLoginUnverifiedGenericErrorAndRateLimit(t *testing.T) {
	svc, _, mailer := setupServiceTest(t)
	ctx := context.Background()
	meta := ClientMeta{IP: "127.0.0.1", UserAgent: "test-agent"}

	_, err := svc.Register(ctx, RegisterRequest{
		Name:     "Dodi",
		Email:    "dodi@example.com",
		Phone:    "081234567890",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatal(err)
	}

	// Unverified user cannot login
	_, err = svc.Login(ctx, LoginRequest{Email: "dodi@example.com", Password: "Password123!"}, meta)
	assertAppErrorCode(t, err, ErrNotVerified.Code)

	// Non-existent email and wrong password return identical error
	_, missingErr := svc.Login(ctx, LoginRequest{Email: "nobody@example.com", Password: "Password123!"}, meta)
	assertAppErrorCode(t, missingErr, ErrInvalidCredentials.Code)

	_, wrongPassErr := svc.Login(ctx, LoginRequest{Email: "dodi@example.com", Password: "WrongPassword"}, meta)
	assertAppErrorCode(t, wrongPassErr, ErrInvalidCredentials.Code)
	if missingErr.Error() != wrongPassErr.Error() {
		t.Fatalf("expected identical login error message, got %q vs %q", missingErr.Error(), wrongPassErr.Error())
	}

	// Verify user and test 5 failed logins -> 429
	if err := svc.VerifyOTP(ctx, VerifyOTPRequest{Email: "dodi@example.com", OTP: mailer.sent[0].otp}); err != nil {
		t.Fatal(err)
	}

	for range 4 {
		_, err = svc.Login(ctx, LoginRequest{Email: "dodi@example.com", Password: "WrongPassword"}, meta)
		assertAppErrorCode(t, err, ErrInvalidCredentials.Code)
	}
	_, err = svc.Login(ctx, LoginRequest{Email: "dodi@example.com", Password: "WrongPassword"}, meta)
	assertAppErrorCode(t, err, ErrTooManyLoginAttempts.Code)

	// Login from another IP succeeds
	res, err := svc.Login(ctx, LoginRequest{Email: "dodi@example.com", Password: "Password123!"}, ClientMeta{IP: "10.0.0.2"})
	if err != nil {
		t.Fatalf("expected login to succeed, got %v", err)
	}
	if res.Response.AccessToken == "" || res.RefreshToken == "" {
		t.Fatal("expected access and refresh tokens")
	}
}

func TestRefreshRotationReuseDetectionAndLogout(t *testing.T) {
	svc, _, mailer := setupServiceTest(t)
	ctx := context.Background()
	meta := ClientMeta{IP: "127.0.0.1", UserAgent: "test"}

	_, err := svc.Register(ctx, RegisterRequest{
		Name:     "Eka",
		Email:    "eka@example.com",
		Phone:    "081234567890",
		Password: "Password123!",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.VerifyOTP(ctx, VerifyOTPRequest{Email: "eka@example.com", OTP: mailer.sent[0].otp}); err != nil {
		t.Fatal(err)
	}

	loginRes, err := svc.Login(ctx, LoginRequest{Email: "eka@example.com", Password: "Password123!"}, meta)
	if err != nil {
		t.Fatal(err)
	}

	// Rotate refresh token
	refreshed, err := svc.Refresh(ctx, loginRes.RefreshToken, meta)
	if err != nil {
		t.Fatalf("refresh failed: %v", err)
	}
	if refreshed.RefreshToken == loginRes.RefreshToken {
		t.Fatal("expected rotated refresh token to differ")
	}

	// Reusing the old revoked token must fail AND revoke the whole family
	_, err = svc.Refresh(ctx, loginRes.RefreshToken, meta)
	assertAppErrorCode(t, err, ErrInvalidRefresh.Code)

	_, err = svc.Refresh(ctx, refreshed.RefreshToken, meta)
	assertAppErrorCode(t, err, ErrInvalidRefresh.Code)

	// New login + logout revokes token
	loginRes2, err := svc.Login(ctx, LoginRequest{Email: "eka@example.com", Password: "Password123!"}, meta)
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.Logout(ctx, loginRes2.RefreshToken); err != nil {
		t.Fatalf("logout failed: %v", err)
	}
	_, err = svc.Refresh(ctx, loginRes2.RefreshToken, meta)
	assertAppErrorCode(t, err, ErrInvalidRefresh.Code)
}

func TestProfileAndChangePassword(t *testing.T) {
	svc, repo, mailer := setupServiceTest(t)
	ctx := context.Background()
	meta := ClientMeta{IP: "127.0.0.1", UserAgent: "test"}

	regRes, err := svc.Register(ctx, RegisterRequest{
		Name:     "Fajar",
		Email:    "fajar@example.com",
		Phone:    "081234567890",
		Password: "OldPassword123!",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.VerifyOTP(ctx, VerifyOTPRequest{Email: "fajar@example.com", OTP: mailer.sent[0].otp}); err != nil {
		t.Fatal(err)
	}

	loginRes, err := svc.Login(ctx, LoginRequest{Email: "fajar@example.com", Password: "OldPassword123!"}, meta)
	if err != nil {
		t.Fatal(err)
	}

	me, err := svc.Me(ctx, regRes.ID)
	if err != nil || me.Name != "Fajar" {
		t.Fatalf("unexpected Me result: %+v, err=%v", me, err)
	}

	updated, err := svc.UpdateProfile(ctx, regRes.ID, UpdateProfileRequest{
		Name:  "Fajar Pratama",
		Phone: "089876543210",
	})
	if err != nil || updated.Name != "Fajar Pratama" || updated.Phone != "089876543210" {
		t.Fatalf("unexpected UpdateProfile result: %+v, err=%v", updated, err)
	}

	// Wrong current password rejected
	err = svc.ChangePassword(ctx, regRes.ID, ChangePasswordRequest{
		CurrentPassword: "WrongPassword",
		NewPassword:     "NewPassword123!",
	})
	assertAppErrorCode(t, err, ErrWrongCurrentPassword.Code)

	// Valid password change updates hash, increments token_version, and revokes refresh tokens
	err = svc.ChangePassword(ctx, regRes.ID, ChangePasswordRequest{
		CurrentPassword: "OldPassword123!",
		NewPassword:     "NewPassword123!",
	})
	if err != nil {
		t.Fatalf("change password failed: %v", err)
	}

	user, _ := repo.FindUserByID(ctx, regRes.ID)
	if user.TokenVersion != 2 {
		t.Fatalf("expected token_version 2, got %d", user.TokenVersion)
	}

	_, err = svc.Refresh(ctx, loginRes.RefreshToken, meta)
	assertAppErrorCode(t, err, ErrInvalidRefresh.Code)

	_, err = svc.Login(ctx, LoginRequest{Email: "fajar@example.com", Password: "NewPassword123!"}, meta)
	if err != nil {
		t.Fatalf("expected login with new password to succeed: %v", err)
	}
}
