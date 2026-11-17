package email

import (
	"strings"
	"testing"
)

func TestRenderOTPEmail(t *testing.T) {
	body := RenderOTPEmail("Budi <script>", "123456", 15, "Football Booking")

	if !strings.Contains(body, "Verifikasi Email Anda") {
		t.Fatal("expected Indonesian heading")
	}
	if !strings.Contains(body, "123456") {
		t.Fatal("expected OTP code in body")
	}
	if !strings.Contains(body, "15 menit") {
		t.Fatal("expected TTL in minutes")
	}
	if strings.Contains(body, "<script>") {
		t.Fatal("expected recipient name to be HTML-escaped")
	}
}

func TestSanitizeHeader(t *testing.T) {
	got := sanitizeHeader("user@example.com\r\nBcc: evil@example.com")
	if strings.ContainsAny(got, "\r\n") {
		t.Fatalf("expected CR/LF to be stripped, got %q", got)
	}
}
