package random

import (
	"regexp"
	"testing"
	"time"
)

func TestBookingCode(t *testing.T) {
	code, err := BookingCode(time.Date(2026, 11, 21, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^BK-20261121-[A-Z2-9]{6}$`).MatchString(code) {
		t.Fatalf("invalid booking code: %s", code)
	}
}

func TestGenerateOTP(t *testing.T) {
	otp, err := GenerateOTP(6)
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^[0-9]{6}$`).MatchString(otp) {
		t.Fatalf("invalid OTP: %s", otp)
	}
	if _, err := GenerateOTP(0); err == nil {
		t.Fatal("zero-length OTP accepted")
	}
}

func TestTokenAndUUID(t *testing.T) {
	tok, err := Token(32)
	if err != nil {
		t.Fatal(err)
	}
	if len(tok) < 32 {
		t.Fatalf("unexpected token length: %d", len(tok))
	}
	if _, err := Token(0); err == nil {
		t.Fatal("zero-length token accepted")
	}

	id, err := UUID()
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`).MatchString(id) {
		t.Fatalf("invalid UUID v4: %s", id)
	}
}
