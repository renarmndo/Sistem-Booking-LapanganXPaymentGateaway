package booking

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"sistem-booking/internal/middleware"
	"sistem-booking/pkg/pagination"
	"sistem-booking/pkg/response"
	"sistem-booking/pkg/validator"
)

type Handler struct {
	svc      Service
	validate *validator.Validator
}

func NewHandler(svc Service, validate *validator.Validator) *Handler {
	return &Handler{svc: svc, validate: validate}
}

func (h *Handler) CreateOnlineBooking(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		_, body := response.Fail("Autentikasi diperlukan", "UNAUTHORIZED")
		writeJSON(w, http.StatusUnauthorized, body)
		return
	}

	var req CreateBookingRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	if fieldErrs := h.validate.Struct(&req); len(fieldErrs) > 0 {
		status, body := response.ValidationError("Data booking tidak valid", fieldErrs...)
		writeJSON(w, status, body)
		return
	}

	res, err := h.svc.CreateOnlineBooking(r.Context(), userID, req)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}

	status, body := response.Created("Booking berhasil dibuat", res)
	writeJSON(w, status, body)
}

func (h *Handler) ListMyBookings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		_, body := response.Fail("Autentikasi diperlukan", "UNAUTHORIZED")
		writeJSON(w, http.StatusUnauthorized, body)
		return
	}

	q := r.URL.Query()
	res, err := h.svc.ListMyBookings(
		r.Context(),
		userID,
		q.Get("status"),
		pagination.Parse(q.Get("page"), q.Get("limit")),
	)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}

	status, body := response.Success("Daftar booking saya", res)
	writeJSON(w, status, body)
}

func (h *Handler) GetMyBooking(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		_, body := response.Fail("Autentikasi diperlukan", "UNAUTHORIZED")
		writeJSON(w, http.StatusUnauthorized, body)
		return
	}

	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID booking tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}

	res, err := h.svc.GetMyBookingDetail(r.Context(), userID, id)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}

	status, body := response.Success("Detail booking", res)
	writeJSON(w, status, body)
}

func (h *Handler) CancelMyBooking(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		_, body := response.Fail("Autentikasi diperlukan", "UNAUTHORIZED")
		writeJSON(w, http.StatusUnauthorized, body)
		return
	}

	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID booking tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}

	var req CancelBookingRequest
	if r.Body != nil {
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<14)).Decode(&req); err != nil && err != io.EOF {
			status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
			writeJSON(w, status, body)
			return
		}
	}
	if fieldErrs := h.validate.Struct(&req); len(fieldErrs) > 0 {
		status, body := response.ValidationError("Data pembatalan tidak valid", fieldErrs...)
		writeJSON(w, status, body)
		return
	}

	res, err := h.svc.CancelMyBooking(r.Context(), userID, id, req.Reason)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}

	status, body := response.Success("Booking berhasil dibatalkan", res)
	writeJSON(w, status, body)
}

func (h *Handler) CreateOfflineBooking(w http.ResponseWriter, r *http.Request) {
	adminID, ok := middleware.UserID(r.Context())
	if !ok {
		status, body := response.Fail("Unauthorized", "UNAUTHORIZED")
		writeJSON(w, status, body)
		return
	}

	var req CreateOfflineBookingRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	if fieldErrs := h.validate.Struct(&req); len(fieldErrs) > 0 {
		status, body := response.ValidationError("Data booking offline tidak valid", fieldErrs...)
		writeJSON(w, status, body)
		return
	}

	res, err := h.svc.CreateOfflineBooking(r.Context(), adminID, req)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Created("Booking offline berhasil dibuat", res)
	writeJSON(w, status, body)
}

func (h *Handler) RecordAdminPayment(w http.ResponseWriter, r *http.Request) {
	adminID, ok := middleware.UserID(r.Context())
	if !ok {
		status, body := response.Fail("Unauthorized", "UNAUTHORIZED")
		writeJSON(w, status, body)
		return
	}
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID booking tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}

	var req AdminPaymentRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<14)).Decode(&req); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	if fieldErrs := h.validate.Struct(&req); len(fieldErrs) > 0 {
		status, body := response.ValidationError("Data pembayaran tidak valid", fieldErrs...)
		writeJSON(w, status, body)
		return
	}

	res, err := h.svc.RecordAdminPayment(r.Context(), adminID, id, req)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Pembayaran berhasil dicatat", res)
	writeJSON(w, status, body)
}

func (h *Handler) ListAdminBookings(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := AdminBookingFilter{
		Date:          q.Get("date"),
		From:          q.Get("from"),
		To:            q.Get("to"),
		Status:        q.Get("status"),
		PaymentStatus: q.Get("payment_status"),
		Source:        q.Get("source"),
		Query:         q.Get("q"),
		Sort:          q.Get("sort"),
		Pagination:    pagination.Parse(q.Get("page"), q.Get("limit")),
	}
	if fid, ok := parseUintParam(q.Get("field_id")); ok {
		filter.FieldID = &fid
	}

	res, err := h.svc.ListAdminBookings(r.Context(), filter)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar booking admin", res)
	writeJSON(w, status, body)
}

func (h *Handler) GetAdminBooking(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID booking tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}
	res, err := h.svc.GetAdminBookingDetail(r.Context(), id)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Detail booking admin", res)
	writeJSON(w, status, body)
}

func (h *Handler) AdminCancelBooking(w http.ResponseWriter, r *http.Request) {
	adminID, ok := middleware.UserID(r.Context())
	if !ok {
		status, body := response.Fail("Unauthorized", "UNAUTHORIZED")
		writeJSON(w, status, body)
		return
	}
	id, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID booking tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}

	var req AdminCancelBookingRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<14)).Decode(&req); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}
	if fieldErrs := h.validate.Struct(&req); len(fieldErrs) > 0 {
		status, body := response.ValidationError("Data pembatalan tidak valid", fieldErrs...)
		writeJSON(w, status, body)
		return
	}

	res, err := h.svc.AdminCancelBooking(r.Context(), adminID, id, req)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Booking berhasil dibatalkan oleh petugas", res)
	writeJSON(w, status, body)
}

func parseUintParam(raw string) (uint, bool) {
	parsed, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || parsed == 0 {
		return 0, false
	}
	return uint(parsed), true
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
