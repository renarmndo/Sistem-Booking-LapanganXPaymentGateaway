package constant

import "testing"

func TestRedisKeyBuilders(t *testing.T) {
	tests := map[string]string{
		SlotLockKey(7, "2026-11-21", "1900"):     "lock:slot:7:2026-11-21:1900",
		RateLimitKey("login", "ip@example.com"):  "rl:login:ip@example.com",
		IdemKey("order-1", "settlement", "tx-1"): "idem:webhook:order-1:settlement:tx-1",
		OtpRateLimitKey("user@example.com"):      "rl:otp:user@example.com",
		OtpAttemptKey("user@example.com"):        "otp:attempts:user@example.com",
	}
	for actual, expected := range tests {
		if actual != expected {
			t.Fatalf("key = %q, want %q", actual, expected)
		}
	}
}
