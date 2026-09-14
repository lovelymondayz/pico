# CONSTITUTION.md — Pico (Event Photo Sharing)

> This project adheres to the [Hermes Engineering Constitution](/root/hermes/CONSTITUTION.md) (v1.1, ratified 2026-06-10, amended 2026-09-14).

## Project Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Backend | Go 1.22 + Gin + pgx/v4 |
| Database | PostgreSQL 16 |
| Auth | JWT + Guest Tokens |
| Container | Docker + Docker Compose |
| Storage | Local disk or Immich (self-hosted photo library) |

## Design System

Per-project accent: `#10B981` (Emerald) — Fresh, modern, photo-friendly.

## Project-Specific Patterns

### Event Photo Sharing
- Each event has a unique slug with timestamp suffix (e.g., `sarah-wedding-1787092829`)
- Guests access events via QR code or direct link — no account required
- Guest tokens are SHA-256 hashed before storage
- Per-guest photo limits enforced at upload time

### Immich Integration
- Optional: configure via `IMMICH_API_URL` and `IMMICH_API_KEY`
- Each event auto-creates an Immich album on creation
- Photos are added to the event album on upload
- Falls back to local disk storage if Immich not configured

### Photo Processing
- Images are resized to max width (default 1200px)
- Thumbnails generated at 300px width
- WebP, JPEG, and PNG formats supported
- Storage limits enforced per plan (max_storage_mb)

### API Documentation
See [API.md](./API.md) for complete endpoint documentation.
