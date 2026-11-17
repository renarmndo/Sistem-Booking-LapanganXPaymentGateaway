package middleware

import (
	"log/slog"
	"net/http"
)

func Recovery(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				if logger != nil {
					logger.Error("panic recovered", "panic", recovered, "path", r.URL.Path)
				}
				writeJSONError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Terjadi kesalahan pada server")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
