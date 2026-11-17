package setting

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"sistem-booking/internal/constant"
	"sistem-booking/internal/middleware"
	"sistem-booking/pkg/response"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

type SettingInput struct {
	Key         string `json:"key"`
	Value       string `json:"value"`
	Description string `json:"description"`
}

type UpdateSettingsRequest struct {
	Settings []SettingInput `json:"settings"`
	Key      string         `json:"key"`
	Value    string         `json:"value"`
	Desc     string         `json:"description"`
}

func RegisterAdminRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	adminMW := func(next http.HandlerFunc) http.Handler {
		return middleware.Auth(jwtSecret, middleware.RequireRole(constant.RoleAdmin)(next))
	}
	mux.Handle("GET /api/v1/admin/settings", adminMW(h.ListSettings))
	mux.Handle("PUT /api/v1/admin/settings", adminMW(h.UpdateSettings))
}

func (h *Handler) ListSettings(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListAll(r.Context())
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Daftar pengaturan", items)
	writeJSON(w, status, body)
}

func (h *Handler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var req UpdateSettingsRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<14)).Decode(&req); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeJSON(w, status, body)
		return
	}

	inputs := req.Settings
	if len(inputs) == 0 && strings.TrimSpace(req.Key) != "" {
		inputs = []SettingInput{{Key: req.Key, Value: req.Value, Description: req.Desc}}
	}
	if len(inputs) == 0 {
		status, body := response.Fail("Minimal 1 pengaturan wajib diisi", "EMPTY_SETTINGS")
		writeJSON(w, status, body)
		return
	}

	for _, item := range inputs {
		key := strings.TrimSpace(item.Key)
		val := strings.TrimSpace(item.Value)
		if key == "" || val == "" {
			status, body := response.Fail("Key dan value pengaturan wajib diisi", "INVALID_SETTING")
			writeJSON(w, status, body)
			return
		}
		if errMsg := validateSettingValue(key, val); errMsg != "" {
			status, body := response.Fail(errMsg, "INVALID_SETTING_VALUE")
			writeJSON(w, status, body)
			return
		}
		if err := h.svc.Set(r.Context(), key, val, strings.TrimSpace(item.Description)); err != nil {
			status, body := response.FromError(err)
			writeJSON(w, status, body)
			return
		}
	}

	items, err := h.svc.ListAll(r.Context())
	if err != nil {
		status, body := response.FromError(err)
		writeJSON(w, status, body)
		return
	}
	status, body := response.Success("Pengaturan berhasil diperbarui", items)
	writeJSON(w, status, body)
}

func validateSettingValue(key, val string) string {
	switch key {
	case "booking.payment_ttl_minutes", "booking.max_days_ahead", "booking.slot_minutes", "booking.max_pending_per_user", "booking.max_hours":
		n, err := strconv.Atoi(val)
		if err != nil || n <= 0 {
			return "Nilai untuk " + key + " harus berupa bilangan bulat positif"
		}
	case "booking.cancel_full_hours", "booking.cancel_partial_hours":
		n, err := strconv.Atoi(val)
		if err != nil || n < 0 {
			return "Nilai untuk " + key + " harus berupa angka >= 0"
		}
	case "booking.cancel_partial_percent":
		n, err := strconv.Atoi(val)
		if err != nil || n < 0 || n > 100 {
			return "Persentase refund harus antara 0 sampai 100"
		}
	}
	return ""
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
