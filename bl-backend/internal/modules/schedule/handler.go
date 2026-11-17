package schedule

import (
	"encoding/json"
	"net/http"
	"strconv"

	"sistem-booking/pkg/response"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetAvailability(w http.ResponseWriter, r *http.Request) {
	rawID := r.PathValue("id")
	id, err := strconv.ParseUint(rawID, 10, 64)
	if err != nil || id == 0 {
		status, body := response.Fail("ID lapangan tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}

	dateStr := r.URL.Query().Get("date")
	slots, err := h.svc.GetAvailability(r.Context(), uint(id), dateStr)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}

	status, body := response.Success("Ketersediaan slot", slots)
	writeJSON(w, status, body)
}

func writeJSON(w http.ResponseWriter, status int, body response.Body) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
