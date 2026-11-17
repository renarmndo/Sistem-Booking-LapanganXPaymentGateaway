package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"sistem-booking/internal/constant"
)

func Logger(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = time.Now().UTC().Format("20060102150405.000000000")
		}
		w.Header().Set("X-Request-ID", requestID)
		ctx := contextWithRequestID(r.Context(), requestID)
		writer := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(writer, r.WithContext(ctx))
		if logger != nil {
			logger.Info("http request", "request_id", requestID, "method", r.Method, "path", r.URL.Path, "status", writer.status, "latency_ms", time.Since(started).Milliseconds())
		}
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func contextWithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, constant.ContextRequestID, requestID)
}
