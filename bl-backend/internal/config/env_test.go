package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnv(t *testing.T) {
	dir := t.TempDir()
	envPath := filepath.Join(dir, ".env")
	content := "# comment\nTEST_DOTENV_A=hello\nTEST_DOTENV_B=\"quoted value\"\nTEST_DOTENV_EXISTING=from_file\n"
	if err := os.WriteFile(envPath, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}

	t.Setenv("TEST_DOTENV_EXISTING", "from_os")
	t.Cleanup(func() {
		_ = os.Unsetenv("TEST_DOTENV_A")
		_ = os.Unsetenv("TEST_DOTENV_B")
	})

	LoadDotEnv(envPath)

	if got := os.Getenv("TEST_DOTENV_A"); got != "hello" {
		t.Fatalf("expected hello, got %q", got)
	}
	if got := os.Getenv("TEST_DOTENV_B"); got != "quoted value" {
		t.Fatalf("expected quoted value, got %q", got)
	}
	if got := os.Getenv("TEST_DOTENV_EXISTING"); got != "from_os" {
		t.Fatalf("expected OS env to take precedence, got %q", got)
	}
}
