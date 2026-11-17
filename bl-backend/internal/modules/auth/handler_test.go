package auth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"sistem-booking/internal/config"
	"sistem-booking/pkg/response"
	"sistem-booking/pkg/validator"
)

func setupTestMux(t *testing.T) (*http.ServeMux, *mockMailer) {
	t.Helper()
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

	mailer := &mockMailer{}
	svc := NewServiceWithLimiter(newMemRepo(), newMemLimiter(), mailer, cfg)
	h := NewHandler(svc, validator.New(), cfg.JWT.RefreshTTL, false)

	mux := http.NewServeMux()
	RegisterRoutes(mux, h, cfg.JWT.Secret)
	return mux, mailer
}

func doJSON(t *testing.T, mux *http.ServeMux, method, path string, body any, bearer string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	for _, c := range cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

func TestAuthHTTPFlow(t *testing.T) {
	mux, mailer := setupTestMux(t)

	// Invalid short password -> 400
	rec := doJSON(t, mux, http.MethodPost, "/api/v1/auth/register", RegisterRequest{
		Name: "Budi", Email: "budi@example.com", Phone: "08123456789", Password: "short",
	}, "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}

	// Valid register -> 201
	rec = doJSON(t, mux, http.MethodPost, "/api/v1/auth/register", RegisterRequest{
		Name: "Budi", Email: "budi@example.com", Phone: "08123456789", Password: "Password123!",
	}, "")
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	// Verify OTP -> 200
	rec = doJSON(t, mux, http.MethodPost, "/api/v1/auth/verify-otp", VerifyOTPRequest{
		Email: "budi@example.com", OTP: mailer.sent[0].otp,
	}, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// Login -> 200 with rt cookie
	rec = doJSON(t, mux, http.MethodPost, "/api/v1/auth/login", LoginRequest{
		Email: "budi@example.com", Password: "Password123!",
	}, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var loginBody struct {
		response.Body
		Data AuthResponse `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &loginBody); err != nil {
		t.Fatal(err)
	}
	if loginBody.Data.AccessToken == "" {
		t.Fatal("expected access token in login response")
	}

	cookies := rec.Result().Cookies()
	if len(cookies) == 0 || cookies[0].Name != refreshCookieName {
		t.Fatalf("expected rt cookie, got %+v", cookies)
	}

	// GET /auth/me without token -> 401
	rec = doJSON(t, mux, http.MethodGet, "/api/v1/auth/me", nil, "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}

	// GET /auth/me with token -> 200
	rec = doJSON(t, mux, http.MethodGet, "/api/v1/auth/me", nil, loginBody.Data.AccessToken)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// PUT /users/me -> 200
	rec = doJSON(t, mux, http.MethodPut, "/api/v1/users/me", UpdateProfileRequest{
		Name: "Budi Updated", Phone: "08999999999",
	}, loginBody.Data.AccessToken)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// POST /auth/refresh using cookie -> 200
	rec = doJSON(t, mux, http.MethodPost, "/api/v1/auth/refresh", nil, "", cookies[0])
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	refreshedCookies := rec.Result().Cookies()

	// POST /auth/logout -> 200
	rec = doJSON(t, mux, http.MethodPost, "/api/v1/auth/logout", nil, loginBody.Data.AccessToken, refreshedCookies[0])
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}
