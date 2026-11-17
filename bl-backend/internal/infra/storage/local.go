package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"
)

var ErrInvalidPath = errors.New("invalid storage path")

// LocalStorage stores uploaded files on the local filesystem under baseDir
// and returns URLs rooted at publicBaseURL (e.g. "/uploads").
type LocalStorage struct {
	baseDir       string
	publicBaseURL string
}

func NewLocalStorage(baseDir, publicBaseURL string) *LocalStorage {
	if baseDir == "" {
		baseDir = "uploads"
	}
	if publicBaseURL == "" {
		publicBaseURL = "/uploads"
	}
	return &LocalStorage{
		baseDir:       filepath.Clean(baseDir),
		publicBaseURL: "/" + strings.Trim(publicBaseURL, "/"),
	}
}

func (s *LocalStorage) Save(_ context.Context, subdir, filename string, r io.Reader) (string, error) {
	relPath, err := sanitizeRelPath(subdir, filename)
	if err != nil {
		return "", err
	}

	absBase, err := filepath.Abs(s.baseDir)
	if err != nil {
		return "", fmt.Errorf("resolve storage base dir: %w", err)
	}
	targetPath := filepath.Join(absBase, filepath.FromSlash(relPath))
	if !strings.HasPrefix(targetPath, absBase+string(filepath.Separator)) {
		return "", ErrInvalidPath
	}

	if err := os.MkdirAll(filepath.Dir(targetPath), 0o750); err != nil {
		return "", fmt.Errorf("create upload directory: %w", err)
	}

	file, err := os.OpenFile(targetPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o640)
	if err != nil {
		return "", fmt.Errorf("create upload file: %w", err)
	}
	defer func() { _ = file.Close() }()

	if _, err := io.Copy(file, r); err != nil {
		return "", fmt.Errorf("write upload file: %w", err)
	}

	return path.Join(s.publicBaseURL, relPath), nil
}

func (s *LocalStorage) Delete(_ context.Context, publicURL string) error {
	trimmed := strings.TrimPrefix(publicURL, s.publicBaseURL)
	trimmed = strings.TrimPrefix(trimmed, "/")
	if trimmed == "" || strings.Contains(trimmed, "..") {
		return ErrInvalidPath
	}

	absBase, err := filepath.Abs(s.baseDir)
	if err != nil {
		return fmt.Errorf("resolve storage base dir: %w", err)
	}
	targetPath := filepath.Join(absBase, filepath.FromSlash(trimmed))
	if !strings.HasPrefix(targetPath, absBase+string(filepath.Separator)) {
		return ErrInvalidPath
	}

	if err := os.Remove(targetPath); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove upload file: %w", err)
	}
	return nil
}

func sanitizeRelPath(subdir, filename string) (string, error) {
	cleanSub := path.Clean("/" + strings.ReplaceAll(subdir, "\\", "/"))
	cleanFile := path.Base(strings.ReplaceAll(filename, "\\", "/"))
	if cleanFile == "." || cleanFile == "/" || cleanFile == ".." || strings.Contains(cleanFile, "..") {
		return "", ErrInvalidPath
	}
	joined := strings.TrimPrefix(path.Join(cleanSub, cleanFile), "/")
	if joined == "" || strings.Contains(joined, "..") {
		return "", ErrInvalidPath
	}
	return joined, nil
}
