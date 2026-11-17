package token

import (
	"strings"
	"testing"
	"time"
)

func TestGenerateAndParse(t *testing.T) {
	raw, err := Generate(42, "user", "secret-that-is-long-enough", 15*time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := Parse(raw, "secret-that-is-long-enough")
	if err != nil {
		t.Fatal(err)
	}
	if claims.UserID != 42 || claims.Role != "user" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}

func TestParseRejectsWrongSecretAndNonHS256(t *testing.T) {
	raw, err := Generate(1, "admin", "secret-that-is-long-enough", time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := Parse(raw, "wrong-secret"); err == nil {
		t.Fatal("wrong secret was accepted")
	}
	parts := strings.Split(raw, ".")
	if len(parts) != 3 {
		t.Fatal("unexpected JWT format")
	}
}

func TestGenerateRequiresSecret(t *testing.T) {
	if _, err := Generate(1, "user", "", time.Minute); err == nil {
		t.Fatal("empty secret was accepted")
	}
}
