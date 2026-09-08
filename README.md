# Pico — Event Photo Sharing Platform

A modern SaaS platform for collecting and sharing memories at events. Businesses create events, get unique links + QR codes, guests scan and upload photos with individual limits, everyone sees a shared live gallery.

## Quick Start

```bash
# Clone
git clone https://github.com/lovelymondayz/pico.git
cd pico

# Start all services
docker compose up -d --build

# Frontend: http://localhost:3005
# Backend API: http://localhost:8088
# DB: localhost:5436 (user: pico, pass: pico)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
│                     pico.arjism.com (HTTPS)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Tunnel (cf-tunnel)                │
│              http://192.168.88.101:8088 (plain HTTP)            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Nginx Reverse Proxy                      │
│                    :8088 → :8082 (backend)                      │
│                    :8088 → :3005 (frontend)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
┌──────────────────────┐        ┌──────────────────────┐
│   Go + GIN Backend   │        │  React + Vite + TS   │
│   :8082 (internal)   │        │  :3005 (internal)    │
│                      │        │                      │
│  - JWT Auth          │        │  - Tailwind CSS      │
│  - pgx + Postgres    │        │  - react-router-dom  │
│  - Image Processing  │        │  - Photo Grid        │
│  - QR Generation     │        │  - Upload Component  │
│  - File Storage      │        │  - QR Display        │
└──────────┬───────────┘        └──────────────────────┘
           │
           ▼
┌──────────────────────┐        ┌──────────────────────┐
│   PostgreSQL :5436   │        │   Immich Storage     │
│                      │        │   (External/Cloud)   │
│  - Users             │        │                      │
│  - Businesses        │        │  - Photo Library     │
│  - Plans             │        │  - AI Processing     │
│  - Subscriptions     │        │  - Auto Album        │
│  - Events            │        │  - Thumbnails        │
│  - Guests            │        │                      │
│  - Photos            │        │                      │
└──────────────────────┘        └──────────────────────┘
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
- **Immich integration** — photos stored in Immich for AI processing, facial recognition, and cloud backup

## Immich Integration

Pico can use [Immich](https://immich.app/) as its primary photo storage backend. When configured, all uploaded photos are automatically uploaded to Immich and added to a dedicated album.

### Setup

1. **Create an Immich album** in your Immich instance
2. **Get your Immich API key** from Account Settings → API Keys
3. **Configure Pico** by setting these environment variables:

```bash
# .env
IMMICH_API_URL=https://storage.arjism.com
IMMICH_API_KEY=your-immich-api-key
IMMICH_DEVICE_ID=pico
IMMICH_ALBUM_ID=your-album-id
```

### How It Works

- Photos are processed (resized, compressed) by Pico first
- Processed photos are uploaded to Immich via API
- Photos are automatically added to the configured Immich album
- Photo serving redirects to Immich URLs for full-resolution and thumbnails
- If Immich is not configured, falls back to local disk storage

### Benefits

- **AI-powered search** — Immich provides smart search, facial recognition
- **Duplicate detection** — Immich automatically detects duplicates
- **Cloud backup** — Photos stored in your Immich instance
- **External access** — Share Immich links directly

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pico.app | admin123 |

**⚠️ Change the admin password in production!**

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
| DATABASE_URL | postgres://pico:***@postgres:5432/pico | DB connection |
| JWT_SECRET | pico-secret-change-in-production | JWT signing key |
| STORAGE_PATH | /data/photos | Photo storage path (local fallback) |
| MAX_UPLOAD_BYTES | 5242880 | Max file size (5MB) |
| IMAGE_MAX_WIDTH | 1200 | Max image width |
| IMAGE_QUALITY | 70 | JPEG quality (0-100) |
| THUMBNAIL_WIDTH | 300 | Thumbnail width |
| GUEST_TOKEN_EXPIRY_DAYS | 30 | Guest session expiry |
| IMMICH_API_URL | (empty) | Immich API URL (leave empty for local) |
| IMMICH_API_KEY | (empty) | Immich API key |
| IMMICH_DEVICE_ID | pico | Device ID for Immich uploads |
| IMMICH_ALBUM_ID | (empty) | Auto-add photos to this Immich album |

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
2. Or manually: `ssh vps && cd /root/hermes/pico && ./update.sh`

### Production Checklist

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET
- [ ] Configure Immich for photo storage
- [ ] Set up Cloudflare tunnel
- [ ] Register domain (pico.arjism.com)
- [ ] Enable HTTPS
- [ ] Set up automated backups

## License

MIT
