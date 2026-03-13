# =========================================
# nhuthungfoto — Monorepo Makefile
# =========================================

.PHONY: install dev up build lint clean frontend backend

# Install all dependencies
install:
	cd frontend && npm install
	cd backend-node && npm install

# Start frontend only
frontend:
	cd frontend && npm run dev

# Start backend only
backend:
	cd backend-node && npm run dev

# Start full stack (frontend + backend) using background processes
up: install
	@echo "🚀 Starting nhuthungfoto full-stack..."
	@trap 'kill 0' EXIT; \
		(cd backend-node && npm run dev) & \
		(cd frontend && npm run dev) & \
		wait

# Build for production
build:
	cd backend-node && npm run build
	cd frontend && npm run build

# Lint / type-check
lint:
	cd backend-node && npm run lint
	cd frontend && npm run lint

# Clean build artifacts
clean:
	rm -rf frontend/dist backend-node/dist
	rm -rf frontend/node_modules backend-node/node_modules
