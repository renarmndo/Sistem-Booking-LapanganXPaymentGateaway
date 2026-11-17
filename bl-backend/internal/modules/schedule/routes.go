package schedule

import "net/http"

func RegisterPublicRoutes(mux *http.ServeMux, h *Handler) {
	mux.HandleFunc("GET /api/v1/fields/{id}/availability", h.GetAvailability)
}
