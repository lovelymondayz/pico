# Pico — Code Structure

```
pico/
├── README.md                  # Project overview & setup guide
├── ARCHITECTURE.md            # System design & decisions
├── STRUCTURE.md               # This file — code layout
├── PLAN.md                    # Milestones & status
├── Makefile                   # Build/deploy shortcuts
├── docker-compose.yml         # Container orchestration
├── generate_logos.py          # Logo generator script
│
├── backend/
│   ├── Dockerfile             # Multi-stage Go + Alpine
│   ├── go.mod
│   ├── go.sum
│   │
│   ├── cmd/
│   │   └── server/
│   │       └── main.go        # Entry point: routing, middleware, deps
│   │
│   └── internal/
│       ├── auth/              # JWT claims, token validation
│       │   └── auth.go
│       │
│       ├── config/            # Config loading from env vars
│       │   └── config.go
│       │
│       ├── handler/           # HTTP handlers (Gin routes)
│       │   └── handler.go     # Public + Business + Admin + Photo serving
│       │
│       ├── middleware/         # Auth, rate limiting
│       │   ├── auth.go
│       │   └── ratelimit.go
│       │
│       ├── model/             # Data structs (User, Event, Photo, etc.)
│       │   └── models.go
│       │
│       ├── repository/        # DB queries (pgx)
│       │   ├── repository.go  # All repos (User, Business, Plan, Subscription, Event, Guest, Photo)
│       │   ├── migrations.go  # Migration runner
│       │   └── migrations/    # SQL migration files
│       │       ├── 001_create_tables.up.sql
│       │       ├── 002_seed_plans.up.sql
│       │       └── 003_add_immich_id.up.sql
│       │
│       ├── service/           # Business logic layer
│       │   └── services.go    # Auth, Business, Plan, Event, Guest, Photo services
│       │
│       ├── storage/           # File storage abstraction
│       │   ├── storage.go     # Storage interface + NewStorage() factory
│       │   ├── immich.go      # Immich-backed storage (API upload, album, thumbnails)
│       │   └── local.go       # Local-disk storage (default)
│       │
│       └── util/              # Image processing, QR, helpers
│           └── image.go       # Resize, thumbnail, validate
│
├── frontend/
│   ├── Dockerfile             # Multi-stage Node + Nginx
│   ├── nginx.conf             # SPA reverse proxy
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── index.html
│   ├── public/                # Static assets (logos, favicon, robots.txt)
│   │
│   └── src/
│       ├── main.tsx           # React entry point
│       ├── App.tsx            # Router + layout
│       ├── index.css          # Tailwind imports
│       │
│       ├── components/        # Reusable UI components
│       │   └── Layout.tsx
│       │
│       ├── pages/             # Route-level pages
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── Dashboard.tsx      # Business admin
│       │   ├── Admin.tsx          # Platform admin
│       │   ├── EventCreate.tsx    # Create/edit events
│       │   └── EventGallery.tsx   # Public gallery view
│       │
│       ├── services/          # API client layer
│       │   └── api.ts         # Fetch wrapper with base URL
│       │
│       ├── stores/            # State management (Zustand)
│       │   └── auth.ts        # Auth store (login, register, logout)
│       │
│       ├── hooks/             # Custom React hooks
│       ├── types/             # TypeScript types
│       ├── utils/             # Helper utilities
│       └── __tests__/         # Unit tests
│
├── docs/                      # Legacy documentation
│   ├── ARCHITECTURE.md
│   └── PLAN.md
│
└── scripts/
    └── update.sh              # Per-project deploy script
```

---

## Layered Architecture

```
Handler (HTTP) → Service (Logic) → Repository (DB queries) → PostgreSQL
                                  → Storage (Files)        → Immich API / Local disk
```

Each layer only calls the one below it. No upward dependencies.

---

## Key Files & Their Roles

| File | Responsibility |
|------|----------------|
| `backend/cmd/server/main.go` | Bootstraps everything — config, DB, storage, repos, services, handlers, Gin router |
| `backend/internal/config/config.go` | All env vars: PORT, DATABASE_URL, JWT_SECRET, STORAGE_PATH, IMMICH_* |
| `backend/internal/handler/handler.go` | All HTTP handlers — public, business admin, admin, photo serving |
| `backend/internal/middleware/auth.go` | JWT validation — extracts user ID, role, business ID into context |
| `backend/internal/middleware/ratelimit.go` | Token-bucket rate limiter per IP |
| `backend/internal/service/services.go` | All business logic — auth, business, plan, subscription, event, guest, photo |
| `backend/internal/repository/repository.go` | All SQL queries via pgx. Methods per entity |
| `backend/internal/storage/storage.go` | `Storage` interface + `NewStorage()` factory |
| `backend/internal/storage/immich.go` | Immich API client — upload, delete, album, thumbnail URL |
| `backend/internal/storage/local.go` | Local disk — SaveBytes, Delete, ReadFile |
| `backend/internal/model/models.go` | Go structs mirroring DB tables |
| `backend/internal/util/image.go` | Image processing — resize, thumbnail, validate |
| `frontend/src/services/api.ts` | API client — base URL, endpoints, error handling |
| `frontend/src/stores/auth.ts` | Zustand store — login, register, token persistence |
| `frontend/src/pages/*.tsx` | Page-level components for each route |

---

## Database Schema

```
users
├── id, email, password_hash, name, role (admin|business)
├── created_at, updated_at

businesses
├── id, user_id → users.id, name, slug, logo_url
├── created_at

plans
├── id, name, max_photos, max_events, photos_per_guest, max_storage_mb
├── price, features_json
├── created_at

subscriptions
├── id, business_id → businesses.id, plan_id → plans.id, status
├── current_period_start, current_period_end
├── created_at

events
├── id, business_id → businesses.id, name, slug, description
├── start_date, end_date, status
├── total_photo_limit, guest_photo_limit, allow_downloads
├── created_at, updated_at

guests
├── id, event_id → events.id, guest_token (SHA-256), name, photo_count
├── created_at, last_active_at

photos
├── id, event_id → events.id, guest_id → guests.id
├── storage_path, thumbnail_path, url, thumbnail_url
├── immich_asset_id          ← NEW: links to Immich asset
├── original_filename, file_size_bytes, mime_type, width, height
├── status (active|deleted|flagged)
├── created_at
```

---

## Immich Integration

```
Photo Upload Flow (with Immich):
                                ┌──────────────────┐
                                │   Pico Backend   │
                                └────────┬─────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
        ▼                                ▼                                ▼
  ┌──────────┐                    ┌──────────────┐                ┌──────────────┐
  │ Validate │───→ Process ───→   │ ImmichStorage│───→ Save ───→  │ Immich API   │
  │ (type/sz)│    (resize)        │   .Save()    │   (multipart)   │ /api/assets  │
  └──────────┘                    └──────────────┘                └──────┬───────┘
                                                                         │
                                                                         ▼
                                                                 ┌──────────────┐
                                                                 │   Return     │
                                                                 │  asset_id    │
                                                                 └──────────────┘
        │
        ├─→ photos.immich_asset_id = asset_id
        └─→ Auto-add to album (PUT /api/albums/:id/assets)
```

When `IMMICH_API_URL` is set, all new uploads go through `ImmichStorage`. When unset, falls back to `LocalStorage`.

---

## API Routes

```
/api/auth/login           POST   Public          → Login, returns JWT
/api/auth/register        POST   Public          → Register business account

/api/e/:slug              GET    Public          → Event details
/api/e/:slug/guest        POST   Public          → Register guest
/api/e/:slug/photos       GET    Public          → List event photos
/api/e/:slug/upload       POST   Guest (token)   → Upload photo

/api/business/events      GET    Business (JWT)  → List my events
/api/business/events      POST   Business (JWT)  → Create event
/api/business/events/:id  PUT    Business (JWT)  → Update event
/api/business/events/:id  DELETE Business (JWT)  → Close event
/api/business/stats       GET    Business (JWT)  → Dashboard stats

/api/admin/plans          GET    Admin (JWT)     → List plans
/api/admin/plans          POST   Admin (JWT)     → Create plan
/api/admin/businesses     GET    Admin (JWT)     → List all businesses
/api/admin/stats          GET    Admin (JWT)     → Platform stats

/photos/:id               GET    Public (orig)   → Redirect to Immich or serve local
/photos/:id/thumb         GET    Public (thumb)  → Redirect to Immich or serve local
```

---

## Deployment

```
GitHub push → deploy-webhook.py (HMAC validation) → scripts/update.sh
    └── git pull
    └── docker compose build --no-cache backend
    └── docker compose build --no-cache frontend  
    └── docker compose up -d --force-recreate
    └── Migrations run automatically on startup
```
