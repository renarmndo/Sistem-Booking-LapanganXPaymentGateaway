package auth

import (
	"net/http"

	"sistem-booking/internal/middleware"
)

// RegisterRoutes mounts public and authenticated auth/user endpoints onto mux.
func RegisterRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	authMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, next)
	}

	mux.HandleFunc("POST /api/v1/auth/register", h.Register)
	mux.HandleFunc("POST /api/v1/auth/verify-otp", h.VerifyOTP)
	mux.HandleFunc("POST /api/v1/auth/resend-otp", h.ResendOTP)
	mux.HandleFunc("POST /api/v1/auth/login", h.Login)
	mux.HandleFunc("POST /api/v1/auth/refresh", h.Refresh)

	mux.Handle("POST /api/v1/auth/logout", authMW(h.Logout))
	mux.Handle("GET /api/v1/auth/me", authMW(h.Me))
	mux.Handle("PUT /api/v1/users/me", authMW(h.UpdateProfile))
	mux.Handle("PUT /api/v1/users/me/password", authMW(h.ChangePassword))
}
