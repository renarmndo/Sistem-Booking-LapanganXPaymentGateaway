package logger

import (
	"bytes"
	"os"
	"strings"
	"testing"
)

func TestNewWritesJSONAndUsesLevel(t *testing.T) {
	var output bytes.Buffer
	log := New(&output, "error")
	log.Info("hidden")
	log.Error("visible")
	if strings.Contains(output.String(), "hidden") || !strings.Contains(output.String(), "visible") {
		t.Fatalf("unexpected logger output: %s", output.String())
	}
	if !strings.Contains(output.String(), `"level":"ERROR"`) {
		t.Fatalf("expected JSON error level: %s", output.String())
	}
}

func TestFromEnvAndLevels(t *testing.T) {
	for _, level := range []string{"debug", "info", "warn", "warning", "error", "unknown"} {
		if err := os.Setenv("LOG_LEVEL", level); err != nil {
			t.Fatal(err)
		}
		if FromEnv(nil) == nil {
			t.Fatalf("logger is nil for level %q", level)
		}
	}
}
