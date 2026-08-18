package config

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	DatabaseURL       string
	JWTSecret         string
	JWTExpiryHours    time.Duration
	StoragePath       string
	MaxUploadBytes    int64
	ImageMaxWidth     int
	ImageQuality      int
	ThumbnailWidth    int
	GuestTokenExpiry  time.Duration
	RateLimitRequests int
	RateLimitWindow   time.Duration
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Port:              getEnv("PORT", "8082"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://pico:pico@localhost:5435/pico?sslmode=disable"),
		JWTSecret:         getEnv("JWT_SECRET", "pico-secret-change-in-production"),
		JWTExpiryHours:    time.Duration(getEnvInt("JWT_EXPIRY_HOURS", 72)) * time.Hour,
		StoragePath:       getEnv("STORAGE_PATH", "/data/photos"),
		MaxUploadBytes:    int64(getEnvInt("MAX_UPLOAD_BYTES", 5*1024*1024)),
		ImageMaxWidth:     getEnvInt("IMAGE_MAX_WIDTH", 1200),
		ImageQuality:      getEnvInt("IMAGE_QUALITY", 70),
		ThumbnailWidth:    getEnvInt("THUMBNAIL_WIDTH", 300),
		GuestTokenExpiry:  time.Duration(getEnvInt("GUEST_TOKEN_EXPIRY_DAYS", 30)) * 24 * time.Hour,
		RateLimitRequests: getEnvInt("RATE_LIMIT_REQUESTS", 10),
		RateLimitWindow:   time.Duration(getEnvInt("RATE_LIMIT_WINDOW_SECONDS", 60)) * time.Second,
	}
}

func getEnv(key, defaultVal string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if v, ok := os.LookupEnv(key); ok {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
		log.Printf("Invalid int for %s, using default %d", key, defaultVal)
	}
	return defaultVal
}
