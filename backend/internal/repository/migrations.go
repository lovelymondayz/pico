package repository

import (
	"context"
	"embed"
	"fmt"
	"log"
	"path/filepath"
	"sort"
	"strings"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func RunMigrations(db *DB) error {
	// Create migrations tracking table
	_, err := db.Pool().Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id SERIAL PRIMARY KEY,
			filename VARCHAR(255) UNIQUE NOT NULL,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("creating migrations table: %w", err)
	}

	// Get applied migrations
	rows, err := db.Pool().Query(context.Background(), `SELECT filename FROM schema_migrations ORDER BY id`)
	if err != nil {
		return fmt.Errorf("fetching applied migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var filename string
		if err := rows.Scan(&filename); err != nil {
			return err
		}
		applied[filename] = true
	}

	// Get migration files
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("reading migrations: %w", err)
	}

	var filenames []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".up.sql") {
			filenames = append(filenames, entry.Name())
		}
	}
	sort.Strings(filenames)

	// Apply pending migrations
	for _, filename := range filenames {
		if applied[filename] {
			continue
		}

		log.Printf("Applying migration: %s", filename)

		content, err := migrationsFS.ReadFile(filepath.Join("migrations", filename))
		if err != nil {
			return fmt.Errorf("reading migration %s: %w", filename, err)
		}

		_, err = db.Pool().Exec(context.Background(), string(content))
		if err != nil {
			return fmt.Errorf("applying migration %s: %w", filename, err)
		}

		_, err = db.Pool().Exec(context.Background(), `INSERT INTO schema_migrations (filename) VALUES ($1)`, filename)
		if err != nil {
			return fmt.Errorf("recording migration %s: %w", filename, err)
		}

		log.Printf("Applied migration: %s", filename)
	}

	return nil
}
