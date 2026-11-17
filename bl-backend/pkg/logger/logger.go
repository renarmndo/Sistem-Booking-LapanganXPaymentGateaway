package logger

import (
	"io"
	"log/slog"
	"os"
	"strings"
)

func New(output io.Writer, level string) *slog.Logger {
	if output == nil {
		output = os.Stdout
	}
	return slog.New(slog.NewJSONHandler(output, &slog.HandlerOptions{Level: parseLevel(level)}))
}

func FromEnv(output io.Writer) *slog.Logger {
	return New(output, os.Getenv("LOG_LEVEL"))
}

func parseLevel(value string) slog.Level {
	switch strings.ToLower(value) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
