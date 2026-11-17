package auth

import (
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"sistem-booking/internal/middleware"
	"sistem-booking/pkg/response"
	"sistem-booking/pkg/validator"
)

const refreshCookieName = "rt"

type Handler struct {
	svc        Service
	validate   *validator.Validator
	refreshTTL time.Duration
	isProd     bool
}

func NewHandler(svc Service, validate *validator.Validator, refreshTTL time.Duration, isProd bool) *Handler {
	return &Handler{
		svc:        svc,
		validate:   validate,
		refreshTTL: refreshTTL,
		isProd:     isProd,
	}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	res, err := h.svc.Register(r.Context(), req)
	if err != nil {
		writeErr(w, err)
		return
	}
	status, body := response.Created("Registrasi berhasil, silakan cek email untuk kode OTP", res)
	writeResp(w, status, body)
}

func (h *Handler) VerifyOTP(w http.ResponseWriter, r *http.Request) {
	var req VerifyOTPRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	if err := h.svc.VerifyOTP(r.Context(), req); err != nil {
		writeErr(w, err)
		return
	}
	status, body := response.Success("Verifikasi akun berhasil", nil)
	writeResp(w, status, body)
}

func (h *Handler) ResendOTP(w http.ResponseWriter, r *http.Request) {
	var req ResendOTPRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	if err := h.svc.ResendOTP(r.Context(), req); err != nil {
		writeErr(w, err)
		return
	}
	status, body := response.Success("Kode OTP baru telah dikirim ke email Anda", nil)
	writeResp(w, status, body)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	res, err := h.svc.Login(r.Context(), req, clientMeta(r))
	if err != nil {
		writeErr(w, err)
		return
	}
	h.setRefreshCookie(w, res.RefreshToken)
	status, body := response.Success("Login berhasil", res.Response)
	writeResp(w, status, body)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	rawToken := extractRefreshToken(r)
	res, err := h.svc.Refresh(r.Context(), rawToken, clientMeta(r))
	if err != nil {
		h.clearRefreshCookie(w)
		writeErr(w, err)
		return
	}
	h.setRefreshCookie(w, res.RefreshToken)
	status, body := response.Success("Token berhasil diperbarui", res.Response)
	writeResp(w, status, body)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	rawToken := extractRefreshToken(r)
	if err := h.svc.Logout(r.Context(), rawToken); err != nil {
		writeErr(w, err)
		return
	}
	h.clearRefreshCookie(w)
	status, body := response.Success("Logout berhasil", nil)
	writeResp(w, status, body)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeResp(w, http.StatusUnauthorized, response.Body{Success: false, Message: "Autentikasi diperlukan", Code: "UNAUTHORIZED"})
		return
	}
	res, err := h.svc.Me(r.Context(), userID)
	if err != nil {
		writeErr(w, err)
		return
	}
	status, body := response.Success("Profil pengguna", res)
	writeResp(w, status, body)
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeResp(w, http.StatusUnauthorized, response.Body{Success: false, Message: "Autentikasi diperlukan", Code: "UNAUTHORIZED"})
		return
	}
	var req UpdateProfileRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	res, err := h.svc.UpdateProfile(r.Context(), userID, req)
	if err != nil {
		writeErr(w, err)
		return
	}
	status, body := response.Success("Profil berhasil diperbarui", res)
	writeResp(w, status, body)
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		writeResp(w, http.StatusUnauthorized, response.Body{Success: false, Message: "Autentikasi diperlukan", Code: "UNAUTHORIZED"})
		return
	}
	var req ChangePasswordRequest
	if !h.decodeAndValidate(w, r, &req) {
		return
	}
	if err := h.svc.ChangePassword(r.Context(), userID, req); err != nil {
		writeErr(w, err)
		return
	}
	h.clearRefreshCookie(w)
	status, body := response.Success("Kata sandi berhasil diperbarui", nil)
	writeResp(w, status, body)
}

func (h *Handler) decodeAndValidate(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(dst); err != nil {
		status, body := response.Fail("Format JSON tidak valid", "INVALID_JSON")
		writeResp(w, status, body)
		return false
	}
	if fieldErrs := h.validate.Struct(dst); len(fieldErrs) > 0 {
		status, body := response.ValidationError("Data tidak valid", fieldErrs...)
		writeResp(w, status, body)
		return false
	}
	return true
}

func (h *Handler) setRefreshCookie(w http.ResponseWriter, value string) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    value,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   h.isProd,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(h.refreshTTL.Seconds()),
	})
}

func (h *Handler) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   h.isProd,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

func extractRefreshToken(r *http.Request) string {
	if cookie, err := r.Cookie(refreshCookieName); err == nil && strings.TrimSpace(cookie.Value) != "" {
		return strings.TrimSpace(cookie.Value)
	}
	if r.Body == nil {
		return ""
	}
	var req RefreshTokenRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		return ""
	}
	return strings.TrimSpace(req.RefreshToken)
}

func clientMeta(r *http.Request) ClientMeta {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	return ClientMeta{
		IP:        host,
		UserAgent: r.UserAgent(),
	}
}

func writeErr(w http.ResponseWriter, err error) {
	status, body := response.FromError(err)
	writeResp(w, status, body)
}

func writeResp(w http.ResponseWriter, status int, body response.Body) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
