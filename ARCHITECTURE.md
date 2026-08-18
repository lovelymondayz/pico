# Pico — Architecture

## System Overview

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
┌──────────────────────┐
│   PostgreSQL :5436   │
│                      │
│  - Users             │
│  - Businesses        │
│  - Plans             │
│  - Subscriptions     │
│  - Events            │
│  - Guests            │
│  - Photos            │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│   Local Storage      │
│   /data/photos/      │
│   (S3-ready)         │
└──────────────────────┘
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | Go | 1.22+ |
| Web Framework | Gin | v1.10 |
| Database Driver | pgx | v4 |
| Auth | JWT (golang-jwt/jwt) | v5 |
| Password Hashing | bcrypt | - |
| Image Processing | imaging | v1.6 |
| QR Code | go-qrcode | - |
| Frontend | React + Vite + TypeScript | Vite 5, React 18 |
| Styling | Tailwind CSS | v3 |
| Routing | react-router-dom | v6 |
| Storage | Local disk (S3-ready) | - |
| Deployment | Docker Compose | v5.5 |
| Reverse Proxy | Nginx | - |
| Tunnel | Cloudflare Tunnel | - |

## Key Design Decisions

### 1. Accountless Guest Access
- Guests don't need accounts
- Each guest gets a unique `guest_token` (SHA-256 hash)
- Token is the only identity — no email/password required
- QR code encodes the token for easy sharing

### 2. Event Slug with Timestamp
- Event slugs include a timestamp suffix: `sarah-michael-wedding-1787092829`
- Prevents collisions when multiple events have the same name
- Still human-readable and SEO-friendly

### 3. Photo Processing Pipeline
- Upload → Validate (size, type) → Resize (max width) → Generate thumbnail → Save to storage
- Original file preserved, processed version stored separately
- Thumbnail generated for gallery grid performance

### 4. Storage Abstraction
- `storage/` package wraps file I/O
- Currently local disk at `/data/photos/`
- S3 migration: implement `Storage` interface with S3 backend
- No handler/service changes needed

### 5. JWT Claims Include BusinessID
- Token carries `business_id` claim
- Middleware extracts and sets it in context
- Business-scoped queries use `business_id` from token

### 6. Subscription on Registration
- New business accounts auto-subscribe to the cheapest plan
- No payment step (owner bills manually)
- Subscription required before creating events

## API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/e/:slug` | Get event details |
| POST | `/api/e/:slug/guest` | Register as guest |
| GET | `/api/e/:slug/photos` | List event photos |
| GET | `/photos/:id` | Get photo file |
| GET | `/photos/:id/thumb` | Get thumbnail |

### Authenticated (Business)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create business account |
| POST | `/api/auth/login` | Login |
| POST | `/api/business/events` | Create event |
| GET | `/api/business/events` | List my events |
| GET | `/api/business/plans` | List available plans |

### Guest Upload
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/e/:slug/upload` | Upload photo (X-Guest-Token header) |

## Security

- JWT tokens with configurable expiry
- bcrypt password hashing
- CORS middleware (configurable origins)
- File type validation on upload
- File size limits (configurable)
- Guest token required for uploads
- Business ID scoping on all data queries

## Scalability Considerations

- Stateless backend — scale horizontally behind load balancer
- Storage abstraction → S3 for unlimited scale
- Database connection pooling (pgx built-in)
- Image processing is CPU-bound — offload to queue if needed
- CDN-ready via Cloudflare
