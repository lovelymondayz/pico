# Pico — Plan & Status

## Current Status: ✅ MVP Complete & Working

### ✅ Done
- [x] Project scaffolding (Go backend + React frontend)
- [x] Database schema + migrations
- [x] JWT authentication (register, login)
- [x] Business account management
- [x] Subscription model (auto-subscribe on registration)
- [x] Event CRUD (create, get by slug)
- [x] Guest registration (accountless, token-based)
- [x] Photo upload (with X-Guest-Token auth)
- [x] Image processing (resize, thumbnail generation)
- [x] Photo listing by event
- [x] Standard project files (STRUCTURE.md, ARCHITECTURE.md, Makefile, update.sh)

### 📋 Next Steps (Priority Order)

#### Phase 2: Polish & Deploy
- [ ] Create PLAN.md (this file)
- [ ] Push to GitHub
- [ ] Cloudflare tunnel route for pico.arjism.com
- [ ] GitHub Actions auto-deploy on push
- [ ] Frontend polish (responsive, loading states, error handling)

#### Phase 3: Feature Complete
- [ ] QR code generation for event URLs
- [ ] Photo download (full resolution)
- [ ] Photo approval/rejection workflow
- [ ] Guest photo limit enforcement (per-guest + per-event)
- [ ] Event cover image upload
- [ ] Event date picker (start/end)
- [ ] Business dashboard analytics (upload counts, storage used)

#### Phase 4: Production Ready
- [ ] Storage migration to S3 (or R2)
- [ ] Rate limiting on uploads
- [ ] Email notifications (event created, photo uploaded)
- [ ] Admin panel (manage businesses, plans, view all events)
- [ ] Multi-tenant billing integration

## Ports
| Service | External | Internal |
|---------|----------|----------|
| Backend | `:8088` | `:8082` |
| Frontend | `:3005` | `:80` |
| DB | `:5436` | `:5432` |

## Known Issues
- Event slugs include timestamp suffix (intentional — prevents collisions)
- Subscription silently fails on register if no plans exist (now fixed — returns error)
