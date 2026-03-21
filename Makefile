# =========================================
# nhuthungfoto — Monorepo Makefile
# =========================================

.PHONY: install dev up build lint clean frontend backend deploy

# Install all dependencies
install:
	cd frontend && npm install
	cd backend-node && npm install

# Start frontend only
frontend:
	cd frontend && npm run dev

# Start backend only (Cloudflare Workers local dev on http://localhost:8787)
backend:
	cd backend-node && npx wrangler dev

# Start full stack (frontend + backend) using background processes
up: install
	@echo "🚀 Starting nhuthungfoto full-stack..."
	@trap 'kill 0' EXIT; \
		(cd backend-node && npx wrangler dev) & \
		(cd frontend && npm run dev) & \
		wait

# Build frontend for production
build:
	cd frontend && npm run build

# Deploy backend to Cloudflare Workers
deploy:
	cd backend-node && npx wrangler deploy

# Lint / type-check
lint:
	cd backend-node && npm run lint
	cd frontend && npm run lint

# Clean build artifacts
clean:
	rm -rf frontend/dist backend-node/dist
	rm -rf frontend/node_modules backend-node/node_modules
