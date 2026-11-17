package report

import (
	"net/http"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/middleware"
)

func RegisterAdminRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	adminMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, middleware.RequireRole(constant.RoleAdmin)(next))
	}
	mux.Handle("GET /api/v1/admin/dashboard/summary", adminMW(h.AdminDashboardSummary))
	mux.Handle("GET /api/v1/admin/reports/revenue", adminMW(h.AdminRevenueReport))
	mux.Handle("GET /api/v1/admin/reports/utilization", adminMW(h.AdminUtilizationReport))
}

func RegisterOwnerRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	ownerMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, middleware.RequireRole(constant.RoleOwner)(next))
	}
	mux.Handle("GET /api/v1/owner/fields", ownerMW(h.OwnerFields))
	mux.Handle("GET /api/v1/owner/schedule", ownerMW(h.OwnerSchedule))
	mux.Handle("GET /api/v1/owner/bookings", ownerMW(h.OwnerBookings))
	mux.Handle("GET /api/v1/owner/bookings/{id}", ownerMW(h.OwnerBookingDetail))
	mux.Handle("GET /api/v1/owner/transactions", ownerMW(h.OwnerTransactions))
	mux.Handle("GET /api/v1/owner/dashboard/summary", ownerMW(h.OwnerDashboardSummary))
	mux.Handle("GET /api/v1/owner/revenue", ownerMW(h.OwnerRevenue))
	mux.Handle("GET /api/v1/owner/utilization", ownerMW(h.OwnerUtilization))
}
