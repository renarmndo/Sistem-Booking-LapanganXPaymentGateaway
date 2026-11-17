package schedule

import (
	"encoding/json"
	"net/http"
	"strconv"

	"sistem-booking/internal/middleware"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/response"
	"sistem-booking/pkg/validator"
)

type Handler struct {
	svc Service
	val *validator.Validator
}

func NewHandler(svc Service, vals ...*validator.Validator) *Handler {
	var v *validator.Validator
	if len(vals) > 0 {
		v = vals[0]
	}
	return &Handler{svc: svc, val: v}
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

func (h *Handler) ListBlocks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	pq := pagination.Parse(q.Get("page"), q.Get("limit"))
	filter := ScheduleBlockFilter{Page: pq.Page, Limit: pq.Limit}
	if rawField := q.Get("field_id"); rawField != "" {
		if fid, err := strconv.ParseUint(rawField, 10, 64); err == nil && fid > 0 {
			u := uint(fid)
			filter.FieldID = &u
		}
	}
	if rawFrom := q.Get("from"); rawFrom != "" {
		if t, err := parseDateTimeInput(rawFrom); err == nil {
			filter.From = &t
		}
	}
	if rawTo := q.Get("to"); rawTo != "" {
		if t, err := parseDateTimeInput(rawTo); err == nil {
			filter.To = &t
		}
	}

	res, err := h.svc.ListBlocks(r.Context(), filter)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar blokir jadwal", res)
	writeJSON(w, status, body)
}

func (h *Handler) CreateBlock(w http.ResponseWriter, r *http.Request) {
	var req CreateScheduleBlockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		status, body := response.Fail("Payload JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	if h.val != nil {
		if errs := h.val.Struct(&req); len(errs) > 0 {
			status, body := response.ValidationError("Validasi gagal", errs...)
			writeJSON(w, status, body)
			return
		}
	}

	adminID, _ := middleware.UserID(r.Context())
	res, conflicts, err := h.svc.CreateBlock(r.Context(), adminID, req)
	if len(conflicts) > 0 {
		writeJSON(w, http.StatusConflict, response.Body{
			Success: false,
			Message: "Jadwal bentrok dengan booking aktif",
			Code:    "SCHEDULE_BLOCK_CONFLICT",
			Data:    map[string]any{"conflicting_bookings": conflicts},
		})
		return
	}
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}

	status, body := response.Created("Blokir jadwal berhasil dibuat", res)
	writeJSON(w, status, body)
}

func (h *Handler) UpdateBlock(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil || id == 0 {
		status, body := response.Fail("ID blokir tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	var req UpdateScheduleBlockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		status, body := response.Fail("Payload JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	if h.val != nil {
		if errs := h.val.Struct(&req); len(errs) > 0 {
			status, body := response.ValidationError("Validasi gagal", errs...)
			writeJSON(w, status, body)
			return
		}
	}

	res, conflicts, err := h.svc.UpdateBlock(r.Context(), uint(id), req)
	if len(conflicts) > 0 {
		writeJSON(w, http.StatusConflict, response.Body{
			Success: false,
			Message: "Jadwal bentrok dengan booking aktif",
			Code:    "SCHEDULE_BLOCK_CONFLICT",
			Data:    map[string]any{"conflicting_bookings": conflicts},
		})
		return
	}
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}

	status, body := response.Success("Blokir jadwal berhasil diperbarui", res)
	writeJSON(w, status, body)
}

func (h *Handler) DeleteBlock(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil || id == 0 {
		status, body := response.Fail("ID blokir tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	if err := h.svc.DeleteBlock(r.Context(), uint(id)); err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Blokir jadwal berhasil dihapus", nil)
	writeJSON(w, status, body)
}

func writeJSON(w http.ResponseWriter, status int, body response.Body) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
