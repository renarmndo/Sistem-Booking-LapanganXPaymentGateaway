package middleware

import (
	"context"

	"sistem-booking/internal/constant"
)

func UserID(ctx context.Context) (uint, bool) {
	value, ok := ctx.Value(constant.ContextUserID).(uint)
	return value, ok
}

func Role(ctx context.Context) (constant.Role, bool) {
	value, ok := ctx.Value(constant.ContextRole).(constant.Role)
	return value, ok
}
