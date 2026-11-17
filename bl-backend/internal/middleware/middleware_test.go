package middleware

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"sistem-booking/internal/constant"
	"sistem-booking/pkg/token"
)

const testSecret = "test-secret-that-is-long-enough"

func TestAuthAndRBAC(t *testing.T) {
	access, err := token.Generate(7, string(constant.RoleAdmin), testSecret, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	handler := Auth(testSecret, RequireRole(constant.RoleAdmin)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := UserID(r.Context())
		if !ok || userID != 7 {
			t.Fatalf("missing user id")
		}
		w.WriteHeader(http.StatusNoContent)
	})))

	request := httptest.NewRequest(http.MethodGet, "/admin", nil)
	request.Header.Set("Authorization", "Bearer "+access)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", recorder.Code)
	}

	request = httptest.NewRequest(http.MethodGet, "/admin", nil)
	request.Header.Set("Authorization", "Bearer invalid")
	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", recorder.Code)
	}
}

func TestRecoveryCORSAndLogger(t *testing.T) {
	handler := Logger(slog.Default(), Recovery(slog.Default(), CORS([]string{"http://localhost:5173"}, http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	}))))
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.Header.Set("Origin", "http://localhost:5173")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusInternalServerError || recorder.Header().Get("Access-Control-Allow-Origin") == "" || recorder.Header().Get("X-Request-ID") == "" {
		t.Fatalf("unexpected response: %d, headers=%v", recorder.Code, recorder.Header())
	}
}

func TestRateLimit(t *testing.T) {
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	handler := RateLimit(client, "login", 2, time.Minute, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	for i := 0; i < 2; i++ {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, "/login", nil)
		request.RemoteAddr = "127.0.0.1:1234"
		handler.ServeHTTP(recorder, request)
		if recorder.Code != http.StatusNoContent {
			t.Fatalf("request %d status = %d", i, recorder.Code)
		}
	}
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/login", nil)
	request.RemoteAddr = "127.0.0.1:1234"
	handler.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusTooManyRequests || !strings.Contains(recorder.Header().Get("Retry-After"), "60") {
		t.Fatalf("unexpected rate-limit response: %d %v", recorder.Code, recorder.Header())
	}
}
