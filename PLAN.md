# Pico — Plan & Status

## Current State: MVP + Immich Integration (In Progress)

**Live URL:** https://pico.arjism.com  
**Backend API:** https://backend-pico.arjism.com  
**Database:** PostgreSQL :5436 (2 users, 2 businesses, 3 plans, 1 event, 0 guests, 0 photos)

---

## ✅ What's Done (From Brief)

| Brief Requirement | Status | Notes |
|-------------------|--------|-------|
| Business creates event with unique link | ✅ | `pico.arjism.com/e/:slug` |
| QR code generation | ✅ | `/api/business/events/:id/qr` |
| Guests no account needed | ✅ | Token-based guest sessions |
| Take photo with camera or upload | ✅ | `EventGallery.tsx` + mobile camera |
| Individual upload limit (20/guest) | ✅ | Enforced in upload handler |
| Total photo limit per event | ✅ | Default 100 (was 500) |
| Track guest upload count | ✅ | `photo_count` in `guests` table |
| Shared gallery — all guests see all | ✅ | SSE real-time updates |
| Dynamic/auto-updating gallery | ✅ | SSE stream endpoint |
| Grid/gallery layout | ✅ | PhotoGrid component |
| Full screen lightbox | ✅ | Lightbox component |
| Sort by newest | ✅ | `ORDER BY created_at DESC` |
| Admin: manage business accounts | ✅ | Admin panel with list |
| Admin: create/manage plans | ✅ | Plans CRUD |
| Admin: view all events | ✅ | Admin stats endpoint |
| Admin: suspend/delete accounts | ✅ | Suspend endpoint |
| Subscription plans (Starter/Pro/Business) | ✅ | 3 plans seeded |
| Past date prevention | ✅ | Frontend + backend validation |
| Immich integration (partial) | 🔄 | Upload works, serving redirects |

---

## ❌ What's Missing (From Brief)

| Brief Requirement | Priority | Effort | Status |
|-------------------|----------|--------|--------|
| **Cover image upload** per event | 🔴 High | Medium | Not built |
| **Download all photos** (ZIP) | 🔴 High | Medium | Stub only |
| **Delete inappropriate photos** | 🔴 High | Low | Not built |
| **See remaining photo quota** on dashboard | 🟡 Medium | Low | Not built |
| **Search/filter photos** | 🟡 Medium | Medium | Not built |
| **Admin dashboard analytics** (real data) | 🟡 Medium | Medium | Partial |
| **Business dashboard analytics** (real data) | 🟡 Medium | Medium | Dummy data |
| **Admin: monitor total uploaded photos** | 🟡 Medium | Low | Backend exists |
| **Admin: manage payments/subscriptions** | 🟢 Low | High | Future |
| **Individual user (non-business)** | 🟢 Low | High | Future |

---

## 🔍 Immich API Audit

### Available Endpoints (Confirmed Working)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/assets` | POST | `x-api-key` | Upload asset (multipart) |
| `/api/assets/:id` | GET | `x-api-key` | Get asset metadata |
| `/api/assets/:id/original` | GET | `x-api-key` | Download original |
| `/api/assets/:id/thumbnail` | GET | `x-api-key` | Get thumbnail |
| `/api/assets/:id` | DELETE | `x-api-key` | Delete asset |
| `/api/albums` | GET | `x-api-key` | List albums |
| `/api/albums/:id` | GET | `x-api-key` | Get album + assets |
| `/api/albums/:id/assets` | PUT | `x-api-key` | Add assets to album |
| `/api/server/features` | GET | none | Feature flags |

### Immich Features Enabled

- ✅ Smart search
- ✅ Facial recognition
- ✅ Duplicate detection
- ✅ OCR
- ✅ Trash (soft delete)

### Current Immich State

- **Album:** "Pico" (id: `9831003e-1491-41b9-a5cd-b1ffaa1ecb5d`)
- **Assets:** 1 (logo.png test upload)
- **Owner:** Pico Admin (`pico@album.com`)

### What We Need From Immich

| Need | Endpoint | Status |
|------|----------|--------|
| Upload photo | `POST /api/assets` | ✅ Working |
| Get photo URL | `GET /api/assets/:id/original` | ✅ Redirect |
| Get thumbnail URL | `GET /api/assets/:id/thumbnail` | ✅ Redirect |
| Delete photo | `DELETE /api/assets/:id` | ✅ Working |
| Add to album | `PUT /api/albums/:id/assets` | ✅ Working |
| Search photos | `GET /api/search` | ✅ Available (smart search) |

**No additional Immich setup needed.** The API key and album are already configured.

---

## 📋 Execution Plan

### Phase 1: Core Missing Features (Priority Order)

#### 1.1 Photo Deletion (Backend + Frontend)
- **Backend:** `DELETE /api/business/events/:id/photos/:photoID`
  - Delete from Immich (if `immich_asset_id` exists)
  - Delete from DB
  - Decrement guest `photo_count`
- **Frontend:** Add delete button on photo grid (business view)
- **Effort:** ~20 min

#### 1.2 Real Dashboard Stats (Backend + Frontend)
- **Backend queries:**
  - Total events count
  - Active events count
  - Total photos uploaded
  - Total guests
  - Storage used (sum of file sizes)
  - Remaining quota (plan limit - used)
- **Frontend:** Replace dummy data with real API calls
- **Effort:** ~30 min

#### 1.3 Cover Image Upload
- **Backend:** `POST /api/business/events/:id/cover`
  - Accept multipart upload
  - Upload to Immich
  - Store `immich_asset_id` in `events.cover_image_url`
- **Frontend:** Add cover image upload to event create/edit form
- **Effort:** ~45 min

#### 1.4 Download All Photos (ZIP)
- **Backend:** `GET /api/business/events/:id/download`
  - Fetch all photo Immich URLs
  - Stream ZIP archive (in-memory, no temp files)
  - Return ZIP file
- **Frontend:** Add "Download All" button on dashboard
- **Effort:** ~30 min

---

### Phase 2: Enhanced Features

#### 2.1 Photo Search/Filter
- **Backend:** `GET /api/e/:slug/photos?search=keyword`
  - Use Immich smart search if available
  - Fallback: search by filename, guest name, date
- **Frontend:** Search input on gallery page
- **Effort:** ~30 min

#### 2.2 Admin Analytics Dashboard
- **Backend:** Enhance `/api/admin/stats` with:
  - Total photos across platform
  - Storage used per business
  - Upload trends (last 7 days)
  - Top events by photo count
- **Frontend:** Charts/tables on admin panel
- **Effort:** ~45 min

#### 2.3 Remaining Quota Display
- **Backend:** Add to business stats response
- **Frontend:** Show "X / Y photos used" on dashboard
- **Effort:** ~15 min

---

### Phase 3: Test Data & Verification

#### 3.1 Seed Real Test Data
- 1 admin user (`admin@pico.app`)
- 1 business user (`demo@pico.app`)
- 1 business ("Demo Events")
- 1 active event ("Sarah & Michael Wedding")
- 2-3 guests with names
- 5-10 photos uploaded via API (using Immich test images)

#### 3.2 End-to-End Test
- Login as business → Create event → Get QR
- Open event link as guest → Upload photo → Verify in gallery
- Check dashboard stats update
- Test photo deletion
- Test download all
- Verify photos appear in Immich album

---

## 📊 Database State (Current)

| Table | Count | Notes |
|-------|-------|-------|
| users | 2 | admin@pico.app, dummy@pico.app |
| businesses | 2 | Pico Platform, Test Biz |
| plans | 3 | Starter, Professional, Business |
| subscriptions | 2 | Both active |
| events | 1 | sarah-michael-wedding |
| guests | 0 | No guests yet |
| photos | 0 | No photos yet |

---

## 🔑 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pico.app | admin123 |
| Business | dummy@pico.app | dummy123 |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `backend/internal/handler/handler.go` | All HTTP handlers |
| `backend/internal/service/services.go` | Business logic |
| `backend/internal/repository/repository.go` | DB queries |
| `backend/internal/storage/immich.go` | Immich API client |
| `backend/internal/model/models.go` | Data structs |
| `frontend/src/services/api.ts` | API client |
| `frontend/src/stores/auth.ts` | Auth state |
| `frontend/src/pages/EventCreate.tsx` | Event creation form |
| `frontend/src/pages/Dashboard.tsx` | Business dashboard |
| `frontend/src/pages/EventGallery.tsx` | Public gallery |

---

## 🎯 Next Steps

1. **Confirm this plan** — any changes needed?
2. **Execute Phase 1** — photo deletion, real stats, cover image, download
3. **Seed test data** — 1 user, 1 business, 1 event, multiple photos
4. **End-to-end test** — verify everything works with real data

---

*Last updated: 2026-09-08*
