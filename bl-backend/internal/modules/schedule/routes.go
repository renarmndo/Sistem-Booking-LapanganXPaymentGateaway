package schedule

import (
	"net/http"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/middleware"
)

func RegisterPublicRoutes(mux *http.ServeMux, h *Handler) {
	mux.HandleFunc("GET /api/v1/fields/{id}/availability", h.GetAvailability)
}

func RegisterAdminRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	adminMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, middleware.RequireRole(constant.RoleAdmin)(next))
	}
	mux.Handle("GET /api/v1/admin/schedule-blocks", adminMW(h.ListBlocks))
	mux.Handle("POST /api/v1/admin/schedule-blocks", adminMW(h.CreateBlock))
	mux.Handle("PUT /api/v1/admin/schedule-blocks/{id}", adminMW(h.UpdateBlock))
	mux.Handle("DELETE /api/v1/admin/schedule-blocks/{id}", adminMW(h.DeleteBlock))
}
