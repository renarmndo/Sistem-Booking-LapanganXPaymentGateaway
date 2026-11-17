package timeutil

import (
	"testing"
	"time"
)

func TestParseAndStartOfDay(t *testing.T) {
	date, err := ParseDate("2026-11-21")
	if err != nil || date.Location() != WIB {
		t.Fatalf("unexpected date: %v", err)
	}
	clock, err := ParseClock("19:30")
	if err != nil || clock.Hour() != 19 || clock.Minute() != 30 {
		t.Fatalf("unexpected clock: %v", clock)
	}
	start := StartOfDay(time.Date(2026, 11, 21, 19, 30, 0, 0, time.UTC))
	if start.Hour() != 0 || start.Minute() != 0 || start.Location() != WIB {
		t.Fatalf("unexpected start: %v", start)
	}
	if Now().Location() != WIB {
		t.Fatalf("Now() location = %v, want %v", Now().Location(), WIB)
	}
	if !IsPast(time.Now().Add(-time.Hour)) {
		t.Fatal("past time was not detected")
	}
}

func TestInvalidDateAndClock(t *testing.T) {
	if _, err := ParseDate("21-11-2026"); err == nil {
		t.Fatal("invalid date accepted")
	}
	if _, err := ParseClock("7pm"); err == nil {
		t.Fatal("invalid clock accepted")
	}
}
