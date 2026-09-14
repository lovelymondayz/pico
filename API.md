# Pico API Documentation

## Authentication
All authenticated endpoints require `Authorization: Bearer <token>` header.

## Rate Limits
- **Auth endpoints:** 5 requests/minute
- **Upload endpoints:** 10 requests/minute
- **General API:** 100 requests/minute

---

## Auth Endpoints

### POST /api/v1/auth/register
Create a new business account.

**Rate limit:** 5/minute

**Request:**
```json
{
  "email": "user@example.com",
  "password": "min6chars",
  "name": "Full Name",
  "business_name": "Business Name"
}
```

**Response (201):**
```json
{
  "token": "eyJ...",
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "business" },
  "business": { "id": "uuid", "name": "...", "slug": "..." }
}
```

**Errors:**
- `400` — Validation error (email taken, password too short)
- `429` — Rate limit exceeded

---

### POST /api/v1/auth/login
Authenticate and receive JWT token.

**Rate limit:** 5/minute

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJ...",
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "business" }
}
```

**Errors:**
- `401` — Invalid credentials
- `429` — Rate limit exceeded

---

## Event Endpoints

### POST /api/v1/business/events
Create a new event (auth required).

**Request:**
```json
{
  "name": "Sarah & Michael Wedding",
  "description": "A beautiful celebration",
  "start_date": "2026-09-20",
  "end_date": "2026-09-21",
  "total_photo_limit": 500,
  "guest_photo_limit": 20,
  "allow_downloads": true
}
```

**Response (201):**
```json
{
  "event": {
    "id": "uuid",
    "name": "Sarah & Michael Wedding",
    "slug": "sarah-michael-wedding-1787092829",
    "status": "active",
    "total_photo_limit": 500,
    "guest_photo_limit": 20,
    "allow_downloads": true
  }
}
```

**Errors:**
- `400` — Validation error (max events reached, invalid dates)
- `401` — Unauthorized

---

### GET /api/v1/business/events
List all events for authenticated business (auth required).

**Response (200):**
```json
{
  "events": [
    { "id": "uuid", "name": "...", "status": "active", "photo_count": 42 }
  ]
}
```

---

### GET /api/v1/events/:id
Get event details by UUID (auth required).

**Response (200):**
```json
{
  "event": { "id": "uuid", "name": "...", "slug": "...", "status": "active" }
}
```

---

### DELETE /api/v1/events/:id
Close an event (auth required).

**Response (200):**
```json
{ "message": "event closed" }
```

---

## Guest Endpoints

### POST /api/v1/e/:slug/guest
Register as a guest for an event.

**Request:**
```json
{ "name": "John Doe" }
```

**Response (200):**
```json
{
  "token": "guest-token-uuid",
  "guest": { "id": "uuid", "name": "John Doe", "photo_count": 0 }
}
```

---

### POST /api/v1/e/:slug/upload
Upload a photo to an event (guest token required via header).

**Headers:** `X-Guest-Token: <token>`

**Body:** `multipart/form-data` with `photo` field

**Rate limit:** 10/minute

**Response (201):**
```json
{
  "photo": {
    "id": "uuid",
    "url": "/photos/uuid",
    "thumbnail_url": "/photos/uuid/thumb",
    "original_filename": "photo.jpg",
    "file_size_bytes": 1024000,
    "width": 1200,
    "height": 800
  }
}
```

**Errors:**
- `400` — No photo provided, file too large, storage limit reached
- `401` — Guest token required
- `403` — Event or guest photo limit reached
- `404` — Event not found
- `413` — File exceeds max upload size

---

### GET /api/v1/e/:slug/photos
List all photos for an event.

**Query params:** `limit` (default 30), `offset` (default 0), `search`

**Response (200):**
```json
{
  "photos": [{ "id": "uuid", "thumbnail_url": "...", "url": "..." }],
  "total": 42,
  "limit": 30,
  "offset": 0
}
```

---

### GET /api/v1/e/:slug/photos/mine
List photos uploaded by current guest.

**Headers:** `X-Guest-Token: <token>`

**Response (200):**
```json
{
  "photos": [{ "id": "uuid", "thumbnail_url": "..." }],
  "total": 5
}
```

---

## Photo Serving

### GET /photos/:id
Get photo file by UUID.

**Response:** Binary image data with appropriate Content-Type.

---

### GET /photos/:id/thumb
Get thumbnail by UUID.

**Response:** Binary JPEG data.

---

## Admin Endpoints (Admin role required)

### GET /api/v1/admin/stats
Platform-wide statistics.

**Response (200):**
```json
{
  "stats": {
    "total_businesses": 10,
    "total_events": 45,
    "total_photos": 1200,
    "total_storage_mb": 512.5,
    "active_plans": 3,
    "recent_uploads": [{ "date": "2026-09-14", "count": 15 }],
    "top_events": [{ "event_name": "...", "photo_count": 100 }]
  }
}
```

---

### GET /api/v1/admin/users
List all users.

**Response (200):**
```json
{
  "users": [{ "id": "uuid", "name": "...", "email": "...", "role": "business" }]
}
```

---

### PUT /api/v1/admin/users/:id
Update user details.

**Request:**
```json
{ "name": "New Name", "email": "new@email.com", "role": "admin" }
```

**Response (200):**
```json
{ "message": "user updated" }
```

---

### DELETE /api/v1/admin/users/:id
Delete a user.

**Response (200):**
```json
{ "message": "user deleted" }
```

---

## Health Check

### GET /health
Service health status.

**Response (200):**
```json
{ "status": "healthy", "service": "pico" }
```
