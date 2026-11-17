package payment

import (
	"net/http"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/middleware"
)

func RegisterRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	authMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, next)
	}

	// Public Midtrans webhook (signature-verified, excluded from JWT and strict rate limit)
	mux.HandleFunc("POST /api/v1/payments/midtrans/notification", h.MidtransNotification)

	mux.Handle("POST /api/v1/bookings/{id}/pay", authMW(h.PayBooking))
	mux.Handle("POST /api/v1/bookings/{id}/sync-payment", authMW(h.SyncPayment))
}

func RegisterAdminRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	adminMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, middleware.RequireRole(constant.RoleAdmin)(next))
	}
	mux.Handle("GET /api/v1/admin/transactions", adminMW(h.ListAdminTransactions))
	mux.Handle("GET /api/v1/admin/transactions/export", adminMW(h.ExportAdminTransactions))
	mux.Handle("GET /api/v1/admin/transactions/{id}", adminMW(h.GetAdminTransaction))
	mux.Handle("GET /api/v1/admin/refunds", adminMW(h.ListAdminRefunds))
	mux.Handle("PUT /api/v1/admin/refunds/{id}", adminMW(h.ProcessAdminRefund))
}
