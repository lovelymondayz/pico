# Architecture

## Overview

Pico is a multi-tenant event photo sharing platform with three user roles: Admin, Business, and Guest.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.18 + GIN + pgx/v4 + PostgreSQL |
| Frontend | React 18 + Vite + TypeScript + Tailwind |
| Storage | Local filesystem (interface-based, S3-swappable) |
| Auth | JWT (jwt/v3) for businesses/admins, session tokens for guests |
| Real-time | Server-Sent Events (SSE) |
| Image Processing | Go native (imaging lib) |
| QR Codes | skip2/go-qrcode |

## Database Design

### Entity Relationship

```
Users (1) → (1) Businesses (1) → (N) Events (1) → (N) Guests
                                      ↓ (1) → (N) Photos
Users (admin) → manages → Plans → Subscriptions → Businesses
```

### Key Tables

- **users** — admins and business owners
- **businesses** — business accounts linked to users
- **plans** — subscription tiers (configurable)
- **subscriptions** — which plan each business has
- **events** — photo-sharing events with unique slugs
- **guests** — anonymous participants (session-based)
- **photos** — uploaded images with metadata

## Upload Flow

```
Guest uploads photo
       ↓
Validate file type/size
       ↓
Check guest limit (per-session)
       ↓
Check event total limit
       ↓
Check business quota
       ↓
Compress image (1200px / 0.7q)
       ↓
Generate thumbnail (300px)
       ↓
Save to storage
       ↓
Record metadata in DB
       ↓
Broadcast via SSE
```

## Race Condition Protection

Before every upload, a database transaction locks the guest row:

```sql
BEGIN;
SELECT photo_count FROM guests WHERE id = $1 FOR UPDATE;
SELECT COUNT(*) FROM photos WHERE event_id = $1;
-- validate both limits
INSERT INTO photos ...;
UPDATE guests SET photo_count = photo_count + 1;
COMMIT;
```

`FOR UPDATE` serializes concurrent uploads from the same guest.

## Guest Identification

1. On first visit, backend generates random 32-byte token
2. Token stored as SHA256 hash in `guests` table
3. Token returned to client, stored in localStorage
4. Every upload request sends token
5. Token is tied to event — clearing storage = new identity

## Storage Abstraction

```go
type Storage interface {
    Save(file multipart.File, filename string) (string, error)
    SaveBytes(path string, data []byte) error
    Delete(path string) error
    Exists(path string) bool
    GetFullPath(path string) string
    ReadFile(path string) ([]byte, error)
}
```

LocalStorage is the default. Swap to S3/MinIO by implementing this interface.

## Real-Time Gallery

Server-Sent Events (SSE) push new photo URLs to all connected clients:

```
GET /api/e/:slug/photos/stream
  → text/event-stream
  → event: photo
  → data: {"id": 123, "url": "...", ...}
```

Fallback: poll `GET /api/e/:slug/photos?since=<timestamp>` every 10s.

## Security

- JWT tokens for business/admin auth (HS256)
- bcrypt password hashing
- Guest tokens are SHA256-hashed in DB
- Rate limiting on uploads (10 req/60s per IP)
- File type validation (JPEG, PNG, WebP only)
- File size limit (5MB default, configurable)
- Event isolation — guests can only access their own event
- CORS configured for API access

## Scalability Considerations

- Connection pooling (pgx pool: 10 max, 2 min)
- Image compression reduces storage/bandwidth
- Thumbnails for gallery grid (no full-res loading)
- SSE is lightweight vs WebSockets
- Storage abstraction allows S3/MinIO swap
- DB indexes on all query paths
