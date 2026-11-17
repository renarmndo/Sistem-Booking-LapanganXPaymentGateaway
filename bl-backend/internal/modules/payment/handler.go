package payment

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/infra/midtrans"
	"sistem-booking/internal/middleware"
	"sistem-booking/pkg/response"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) PayBooking(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		_, body := response.Fail("Autentikasi diperlukan", "UNAUTHORIZED")
		writeJSON(w, http.StatusUnauthorized, body)
		return
	}

	bookingID, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID booking tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}

	res, err := h.svc.PayBooking(r.Context(), userID, bookingID)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}

	status, body := response.Success("Token pembayaran berhasil dibuat", res)
	writeJSON(w, status, body)
}

func (h *Handler) SyncPayment(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		_, body := response.Fail("Autentikasi diperlukan", "UNAUTHORIZED")
		writeJSON(w, http.StatusUnauthorized, body)
		return
	}
	role, _ := middleware.Role(r.Context())

	bookingID, ok := parseUintParam(r.PathValue("id"))
	if !ok {
		status, body := response.Fail("ID booking tidak valid", "INVALID_ID")
		writeJSON(w, status, body)
		return
	}

	res, err := h.svc.SyncBookingPayment(r.Context(), userID, role == constant.RoleAdmin, bookingID)
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}

	status, body := response.Success("Status pembayaran disinkronkan", res)
	writeJSON(w, status, body)
}

func (h *Handler) MidtransNotification(w http.ResponseWriter, r *http.Request) {
	rawBody, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		status, body := response.Fail("Gagal membaca payload notifikasi", "INVALID_BODY")
		writeJSON(w, status, body)
		return
	}

	var payload midtrans.NotificationPayload
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		status, body := response.Fail("Format JSON notifikasi tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}

	if err := h.svc.HandleWebhook(r.Context(), rawBody, payload); err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}

	status, body := response.Success("Notifikasi diproses", nil)
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
