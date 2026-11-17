package booking

import (
	"net/http"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/middleware"
)

func RegisterRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	authMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, next)
	}

	mux.Handle("POST /api/v1/bookings", authMW(h.CreateOnlineBooking))
	mux.Handle("GET /api/v1/bookings/me", authMW(h.ListMyBookings))
	mux.Handle("GET /api/v1/bookings/{id}", authMW(h.GetMyBooking))
	mux.Handle("POST /api/v1/bookings/{id}/cancel", authMW(h.CancelMyBooking))
}

func RegisterAdminRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	adminMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, middleware.RequireRole(constant.RoleAdmin)(next))
	}
	mux.Handle("POST /api/v1/admin/bookings/offline", adminMW(h.CreateOfflineBooking))
	mux.Handle("POST /api/v1/admin/bookings/{id}/payments", adminMW(h.RecordAdminPayment))
	mux.Handle("GET /api/v1/admin/bookings", adminMW(h.ListAdminBookings))
	mux.Handle("GET /api/v1/admin/bookings/{id}", adminMW(h.GetAdminBooking))
	mux.Handle("POST /api/v1/admin/bookings/{id}/cancel", adminMW(h.AdminCancelBooking))
}
