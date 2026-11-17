package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
	"time"
)

// LoadDotEnv loads key=value pairs from path if the file exists, without
// overriding variables that are already present in the process environment.
func LoadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer func() { _ = file.Close() }()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		if len(val) >= 2 && ((val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'')) {
			val = val[1 : len(val)-1]
		}
		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, val)
		}
	}
}

func GetString(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}

func GetRequiredString(key string) string {
	return os.Getenv(key)
}

func GetInt(key string, fallback int) int {
	value, err := strconv.Atoi(GetString(key, ""))
	if err != nil {
		return fallback
	}
	return value
}

func GetDuration(key string, fallback time.Duration) time.Duration {
	value, err := time.ParseDuration(GetString(key, ""))
	if err != nil {
		return fallback
	}
	return value
}
