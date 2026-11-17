package middleware

import (
	"context"
	"net/http"
	"strings"

	"sistem-booking/internal/constant"
	"sistem-booking/pkg/token"
)

func Auth(secret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Fields(r.Header.Get("Authorization"))
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Autentikasi diperlukan")
			return
		}
		claims, err := token.Parse(parts[1], secret)
		if err != nil || claims.UserID == 0 || !validRole(claims.Role) {
			writeJSONError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Token tidak valid atau sudah kedaluwarsa")
			return
		}
		ctx := contextWithUser(r.Context(), claims.UserID, constant.Role(claims.Role))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func contextWithUser(ctx context.Context, userID uint, role constant.Role) context.Context {
	ctx = context.WithValue(ctx, constant.ContextUserID, userID)
	return context.WithValue(ctx, constant.ContextRole, role)
}

func validRole(value string) bool {
	switch constant.Role(value) {
	case constant.RoleAdmin, constant.RoleUser, constant.RoleOwner:
		return true
	default:
		return false
	}
}
