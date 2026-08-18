# Pico — Code Structure

```
pico/
├── README.md
├── ARCHITECTURE.md      # System design & decisions
├── STRUCTURE.md         # This file — code layout
├── PLAN.md             # Milestones & status
├── Makefile            # Build/deploy shortcuts
├── update.sh           # Per-project deploy script
├── docker-compose.yml  # Container orchestration
├── .gitignore
├── nginx/
│   └── nginx.conf      # Reverse proxy config
│
├── backend/
│   ├── Dockerfile
│   ├── go.mod
│   ├── go.sum
│   ├── cmd/
│   │   └── server/
│   │       └── main.go           # Entry point
│   └── internal/
│       ├── auth/                 # JWT claims, token generation/validation
│       │   ├── auth.go
│       │   └── password.go       # bcrypt hashing
│       ├── config/               # Config loading (env vars)
│       │   └── config.go
│       ├── handler/              # HTTP handlers (Gin routes)
│       │   ├── handler.go        # Auth + Business + Event + Photo handlers
│       │   └── public.go         # Public event endpoints
│       ├── middleware/           # Auth + CORS middleware
│       │   ├── auth.go
│       │   └── cors.go
│       ├── model/                # Data structs
│       │   └── models.go
│       ├── repository/           # DB queries (pgx)
│       │   ├── repository.go     # All repos: User, Business, Plan, Subscription, Event, Guest, Photo
│       │   └── migrations.go     // Migration runner
│       ├── service/              # Business logic
│       │   └── services.go
│       ├── storage/              // File storage abstraction (local disk)
│       │   └── storage.go
│       ├── util/                 // Helpers (QR, slug, etc.)
│       │   └── util.go
│       └── photo/                // Image processing (resize, thumbnail, QR)
│           └── photo.go
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── vite-env.d.ts
        ├── components/
        │   ├── Layout.tsx
        │   ├── PhotoGrid.tsx
        │   ├── UploadButton.tsx
        │   ├── ImageViewer.tsx
        │   └── QRCodeDisplay.tsx
        └── pages/
            ├── Home.tsx           # Landing/register
            ├── Login.tsx
            ├── Register.tsx
            ├── Dashboard.tsx      # Business admin
            ├── EventCreate.tsx
            ├── EventGallery.tsx   # Public gallery view
            └── PhotoUpload.tsx    # Guest upload view
```

## Key Patterns

- **Repository Pattern**: `repository.go` contains all DB operations (UserRepo, BusinessRepo, PlanRepo, SubscriptionRepo, EventRepo, GuestRepo, PhotoRepo). Each repo has Create, GetByID, GetAll, Update, Delete methods.
- **Service Layer**: `services.go` contains business logic orchestration. Calls repositories, not DB directly.
- **Handler Layer**: `handler.go` is the Gin HTTP layer. Parses requests, calls services, returns JSON.
- **Storage Abstraction**: `storage/` wraps local disk I/O — swap for S3 later without touching handlers.
- **Photo Processing**: `photo/` handles image validation, resizing, thumbnail generation, QR code creation.

## Database Schema

- `users` — id, email, password_hash, name, role, created_at, updated_at
- `businesses` — id, user_id, name, slug, logo_url, created_at
- `plans` — id, name, max_photos, max_events, photos_per_guest, max_storage_mb, price, features_json, created_at
- `subscriptions` — id, business_id, plan_id, status, current_period_start, current_period_end, created_at
- `events` — id, business_id, name, slug, description, cover_image_url, start_date, end_date, status, total_photo_limit, guest_photo_limit, allow_downloads, created_at, updated_at
- `guests` — id, event_id, guest_token, name, photo_count, created_at, last_active_at
- `photos` — id, event_id, guest_id, storage_path, thumbnail_path, url, thumbnail_url, original_filename, file_size_bytes, mime_type, width, height, status, created_at
