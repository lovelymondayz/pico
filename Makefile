.PHONY: dev build up down migrate psql logs clean deploy

# Start development environment (Docker DB + Go backend + Vite frontend)
dev:
	docker compose up -d db
	cd backend && go run . &
	cd frontend && npm run dev
	@echo "Backend: http://localhost:8085 | Frontend: http://localhost:5173"

# Production build
build:
	cd frontend && npm ci && npm run build
	cd backend && go build -o pico-api .
	@echo "Build complete"

# Docker operations
up:
	docker compose up -d --build
	@echo "Pico running — FE: http://localhost:3005, BE: http://localhost:8085"

down:
	docker compose down

# Database
psql:
	docker compose exec pico-postgres psql -U pico -d pico

migrate-up:
	@echo "Migrations run automatically on backend startup"

# Deploy (push to GitHub first, then run this)
deploy:
	./update.sh

# Utility
logs:
	docker compose logs -f

clean:
	docker compose down -v
	rm -rf frontend/dist backend/pico-api
