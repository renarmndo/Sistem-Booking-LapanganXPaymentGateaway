package report

import (
	"encoding/json"
	"net/http"

	"sistem-booking/pkg/response"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) AdminDashboardSummary(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	res, err := h.svc.GetAdminDashboardSummary(r.Context(), q.Get("from"), q.Get("to"))
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Ringkasan dashboard Noel Futsal", res)
	writeJSON(w, status, body)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
