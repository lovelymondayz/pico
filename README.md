# Pico — Event Photo Sharing Platform

A modern SaaS platform for collecting and sharing memories at events. Businesses create events, get unique links + QR codes, guests scan and upload photos with individual limits, everyone sees a shared live gallery.

## Quick Start

```bash
# Clone
git clone https://github.com/lovelymondayz/pico.git
cd pico

# Start all services
docker compose up -d --build

# Frontend: http://localhost:3003
# Backend API: http://localhost:8082
# DB: localhost:5435 (user: pico, pass: pico)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        NGINX (80/443)                        │
│                   pico.arjism.com → :3003                   │
├─────────────────────────────────────────────────────────────┤
│  React + Vite + TS + Tailwind  │  Go + GIN + pgx + Postgres │
│        (Frontend :3003)        │       (Backend :8082)      │
├─────────────────────────────────────────────────────────────┤
│              PostgreSQL :5435  │  Local Storage (/data)     │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Three roles:** Admin, Business, Guest
- **Unique event links:** `pico.arjism.com/e/:slug`
- **QR code generation** for each event
- **Mobile-first guest experience** (camera + upload)
- **Real-time gallery** via SSE
- **Per-guest upload limits** (session-based)
- **Event total photo limits** (subscription-based)
- **Subscription plans** (Starter/Professional/Business)
- **Image compression** (1200px / 0.7 quality)
- **Thumbnail generation** (300px)
- **Rate limiting** on uploads
- **Race-condition safe** uploads

## API Endpoints

### Public
- `GET /api/e/:slug` — Event info
- `POST /api/e/:slug/guest` — Register guest
- `GET /api/e/:slug/photos` — List photos
- `GET /api/e/:slug/photos/stream` — SSE stream
- `POST /api/e/:slug/upload` — Upload photo

### Business (JWT required)
- `GET /api/business/events` — My events
- `POST /api/business/events` — Create event
- `GET /api/business/events/:id/qr` — Generate QR
- `GET /api/business/stats` — Dashboard stats

### Admin (JWT + admin role)
- `GET /api/admin/plans` — List plans
- `POST /api/admin/plans` — Create plan
- `GET /api/admin/stats` — Platform stats

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8082 | Backend port |
| DATABASE_URL | postgres://pico:pico@postgres:5432/pico | DB connection |
| JWT_SECRET | pico-secret-change-in-production | JWT signing key |
| STORAGE_PATH | /data/photos | Photo storage path |
| MAX_UPLOAD_BYTES | 5242880 | Max file size (5MB) |
| IMAGE_MAX_WIDTH | 1200 | Max image width |
| IMAGE_QUALITY | 70 | JPEG quality (0-100) |
| THUMBNAIL_WIDTH | 300 | Thumbnail width |
| GUEST_TOKEN_EXPIRY_DAYS | 30 | Guest session expiry |

## Development

```bash
# Backend only
cd backend
go run ./cmd/server

# Frontend only
cd frontend
npm install
npm run dev
```

## Deployment

1. Push to `main` → GitHub Action auto-deploys
2. Or manually: `ssh vps && cd /root/pico && ./update.sh`

## License

MIT
