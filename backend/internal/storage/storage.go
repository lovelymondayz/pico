package storage

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"sync"
)

// Storage defines the interface for file storage backends
type Storage interface {
	Save(file multipart.File, filename string) (string, error)
	SaveBytes(path string, data []byte) error
	Delete(path string) error
	Exists(path string) bool
	GetFullPath(path string) string
	ReadFile(path string) ([]byte, error)
}

// LocalStorage implements Storage for local filesystem
type LocalStorage struct {
	basePath string
	mu       sync.Mutex
}

func NewLocalStorage(basePath string) (*LocalStorage, error) {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, fmt.Errorf("creating storage directory: %w", err)
	}
	return &LocalStorage{basePath: basePath}, nil
}

func (s *LocalStorage) Save(file multipart.File, filename string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	fullPath := filepath.Join(s.basePath, filename)
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("creating directory: %w", err)
	}

	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("creating file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("writing file: %w", err)
	}

	return fullPath, nil
}

func (s *LocalStorage) SaveBytes(path string, data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("creating directory: %w", err)
	}

	return os.WriteFile(path, data, 0644)
}

func (s *LocalStorage) Delete(path string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return os.Remove(filepath.Join(s.basePath, path))
}

func (s *LocalStorage) Exists(path string) bool {
	_, err := os.Stat(filepath.Join(s.basePath, path))
	return err == nil
}

func (s *LocalStorage) GetFullPath(path string) string {
	return filepath.Join(s.basePath, path)
}

func (s *LocalStorage) ReadFile(path string) ([]byte, error) {
	return os.ReadFile(filepath.Join(s.basePath, path))
}

// Helper to convert bytes.Reader to multipart.File
func BytesToMultipartFile(data []byte) multipart.File {
	return &bytesReader{bytes.NewReader(data)}
}

type bytesReader struct {
	*bytes.Reader
}

func (b *bytesReader) Close() error { return nil }
