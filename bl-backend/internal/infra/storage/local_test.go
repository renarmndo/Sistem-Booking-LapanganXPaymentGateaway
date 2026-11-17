package storage

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestLocalStorageSaveAndDelete(t *testing.T) {
	baseDir := t.TempDir()
	st := NewLocalStorage(baseDir, "/uploads")
	ctx := context.Background()

	url, err := st.Save(ctx, "fields/1", "test-photo.jpg", bytes.NewBufferString("jpeg-bytes"))
	if err != nil {
		t.Fatalf("save failed: %v", err)
	}
	if url != "/uploads/fields/1/test-photo.jpg" {
		t.Fatalf("unexpected url: %s", url)
	}

	data, err := os.ReadFile(filepath.Join(baseDir, "fields", "1", "test-photo.jpg"))
	if err != nil || string(data) != "jpeg-bytes" {
		t.Fatalf("unexpected file content: %q, err=%v", string(data), err)
	}

	if err := st.Delete(ctx, url); err != nil {
		t.Fatalf("delete failed: %v", err)
	}
	if _, err := os.Stat(filepath.Join(baseDir, "fields", "1", "test-photo.jpg")); !os.IsNotExist(err) {
		t.Fatalf("expected file to be deleted, stat err=%v", err)
	}

	if err := st.Delete(ctx, "/uploads/../secret.txt"); err == nil {
		t.Fatal("expected path traversal delete to fail")
	}
}
