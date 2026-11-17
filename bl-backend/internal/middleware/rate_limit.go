package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"sistem-booking/internal/constant"
)

func RateLimit(client *redis.Client, scope string, limit int, window time.Duration, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if client == nil || limit <= 0 || window <= 0 {
			next.ServeHTTP(w, r)
			return
		}
		identifier := clientIdentifier(r)
		key := constant.RateLimitKey(scope, identifier)
		count, err := increment(r.Context(), client, key, window)
		if err != nil {
			writeJSONError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Pembatasan akses tidak tersedia")
			return
		}
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(max(limit-int(count), 0)))
		if count > int64(limit) {
			w.Header().Set("Retry-After", strconv.Itoa(int(window.Seconds())))
			writeJSONError(w, http.StatusTooManyRequests, "RATE_LIMITED", "Terlalu banyak permintaan")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func increment(ctx context.Context, client *redis.Client, key string, window time.Duration) (int64, error) {
	count, err := client.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}
	if count == 1 {
		if err := client.Expire(ctx, key, window).Err(); err != nil {
			return 0, err
		}
	}
	return count, nil
}

func clientIdentifier(r *http.Request) string {
	if userID, ok := UserID(r.Context()); ok {
		return fmt.Sprintf("user:%d:%s", userID, r.URL.Path)
	}
	return fmt.Sprintf("ip:%s:%s", r.RemoteAddr, r.URL.Path)
}

func max(value, floor int) int {
	if value < floor {
		return floor
	}
	return value
}
