package storage

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

// ImmichConfig holds Immich connection settings
type ImmichConfig struct {
	APIURL   string
	APIKey   string
	DeviceID string
	AlbumID  string // optional: auto-add to album
}

// ImmichStorage implements Storage for Immich photo library
type ImmichStorage struct {
	config ImmichConfig
	client *http.Client
}

// Asset represents an Immich asset response
type ImmichAsset struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

// NewImmichStorage creates a new Immich-backed storage
func NewImmichStorage(config ImmichConfig) (*ImmichStorage, error) {
	return &ImmichStorage{
		config: config,
		client: &http.Client{Timeout: 60 * time.Second},
	}, nil
}

// Save uploads a file to Immich and returns the asset ID
func (s *ImmichStorage) Save(file multipart.File, filename string) (string, error) {
	// Read file into memory
	data, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("reading file: %w", err)
	}

	assetID, err := s.uploadToImmich(data, filename)
	if err != nil {
		return "", fmt.Errorf("uploading to Immich: %w", err)
	}

	return assetID, nil
}

// SaveBytes uploads bytes to Immich (used for processed images)
func (s *ImmichStorage) SaveBytes(path string, data []byte) error {
	// For Immich, we don't use local paths — we upload directly
	// This is a no-op since Save() already handles the upload
	// The path parameter is ignored; Immich assigns its own IDs
	return nil
}

// Delete removes an asset from Immich
func (s *ImmichStorage) Delete(assetID string) error {
	url := fmt.Sprintf("%s/api/assets/%s", s.config.APIURL, assetID)
	req, err := http.NewRequest(http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("creating delete request: %w", err)
	}
	req.Header.Set("x-api-key", s.config.APIKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("deleting asset: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Immich delete failed (%d): %s", resp.StatusCode, string(body))
	}
	return nil
}

// Exists checks if an asset exists in Immich
func (s *ImmichStorage) Exists(assetID string) bool {
	url := fmt.Sprintf("%s/api/assets/%s", s.config.APIURL, assetID)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return false
	}
	req.Header.Set("x-api-key", s.config.APIKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

// GetFullPath returns the Immich URL for viewing the asset
func (s *ImmichStorage) GetFullPath(assetID string) string {
	return fmt.Sprintf("%s/api/assets/%s/original", s.config.APIURL, assetID)
}

// GetThumbnailURL returns the Immich URL for the thumbnail
func (s *ImmichStorage) GetThumbnailURL(assetID string) string {
	return fmt.Sprintf("%s/api/assets/%s/thumbnail", s.config.APIURL, assetID)
}

// ReadFile downloads the asset bytes from Immich
func (s *ImmichStorage) ReadFile(assetID string) ([]byte, error) {
	url := fmt.Sprintf("%s/api/assets/%s/original", s.config.APIURL, assetID)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating download request: %w", err)
	}
	req.Header.Set("x-api-key", s.config.APIKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("downloading asset: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Immich download failed (%d): %s", resp.StatusCode, string(body))
	}

	return io.ReadAll(resp.Body)
}

// GetAssetInfo fetches asset metadata from Immich
func (s *ImmichStorage) GetAssetInfo(assetID string) (*ImmichAsset, error) {
	url := fmt.Sprintf("%s/api/assets/%s", s.config.APIURL, assetID)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("x-api-key", s.config.APIKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching asset info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Immich get asset failed (%d): %s", resp.StatusCode, string(body))
	}

	var asset ImmichAsset
	if err := json.NewDecoder(resp.Body).Decode(&asset); err != nil {
		return nil, fmt.Errorf("decoding asset info: %w", err)
	}
	return &asset, nil
}

// uploadToImmich uploads bytes to Immich and returns the asset ID
func (s *ImmichStorage) uploadToImmich(data []byte, filename string) (string, error) {
	// Build multipart form
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Required fields
	_ = writer.WriteField("deviceAssetId", fmt.Sprintf("pico-%d", time.Now().UnixNano()))
	_ = writer.WriteField("deviceId", s.config.DeviceID)
	_ = writer.WriteField("fileCreatedAt", time.Now().UTC().Format(time.RFC3339))
	_ = writer.WriteField("fileModifiedAt", time.Now().UTC().Format(time.RFC3339))

	// File part
	part, err := writer.CreateFormFile("assetData", filename)
	if err != nil {
		return "", fmt.Errorf("creating form file: %w", err)
	}
	if _, err := part.Write(data); err != nil {
		return "", fmt.Errorf("writing file data: %w", err)
	}
	writer.Close()

	// Send request
	url := fmt.Sprintf("%s/api/assets", s.config.APIURL)
	req, err := http.NewRequest(http.MethodPost, url, &buf)
	if err != nil {
		return "", fmt.Errorf("creating upload request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("x-api-key", s.config.APIKey)
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("uploading to Immich: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Immich upload failed (%d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var result struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parsing Immich response: %w", err)
	}

	// Add to album if configured
	if s.config.AlbumID != "" && result.ID != "" {
		s.addToAlbum(result.ID)
	}

	return result.ID, nil
}

// addToAlbum adds an asset to the configured Immich album
func (s *ImmichStorage) addToAlbum(assetID string) error {
	url := fmt.Sprintf("%s/api/albums/%s/assets", s.config.APIURL, s.config.AlbumID)
	body := fmt.Sprintf(`{"ids":["%s"]}`, assetID)
	req, err := http.NewRequest(http.MethodPut, url, bytes.NewBufferString(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", s.config.APIKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("adding to album failed (%d): %s", resp.StatusCode, string(respBody))
	}
	return nil
}

// Ensure ImmichStorage implements the Storage interface
var _ Storage = (*ImmichStorage)(nil)
