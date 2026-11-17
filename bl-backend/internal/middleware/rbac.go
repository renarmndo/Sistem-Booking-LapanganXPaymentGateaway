package middleware

import (
	"net/http"

	"sistem-booking/internal/constant"
)

func RequireRole(roles ...constant.Role) func(http.Handler) http.Handler {
	allowed := make(map[constant.Role]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, ok := Role(r.Context())
			if !ok {
				writeJSONError(w, http.StatusForbidden, "FORBIDDEN", "Akses tidak diizinkan")
				return
			}
			if _, ok := allowed[role]; !ok {
				writeJSONError(w, http.StatusForbidden, "FORBIDDEN", "Akses tidak diizinkan")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
