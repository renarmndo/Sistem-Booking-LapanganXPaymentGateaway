package auth

import (
	"net/http"

	"sistem-booking/internal/constant"
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

// RegisterAdminRoutes mounts admin user/customer management endpoints.
func RegisterAdminRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	adminMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, middleware.RequireRole(constant.RoleAdmin)(next))
	}
	mux.Handle("GET /api/v1/admin/users", adminMW(h.ListAdminUsers))
	mux.Handle("GET /api/v1/admin/users/{id}", adminMW(h.GetAdminUser))
	mux.Handle("POST /api/v1/admin/users", adminMW(h.CreateAdminUser))
	mux.Handle("PUT /api/v1/admin/users/{id}", adminMW(h.UpdateAdminUser))
	mux.Handle("POST /api/v1/admin/users/{id}/reset-password", adminMW(h.ResetAdminUserPassword))
}
