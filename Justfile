set shell := ["zsh", "-c"]

# nhuthungfoto — Monorepo Justfile

# Display available recipes
default:
    @just --list

# Install all dependencies
install:
    cd frontend && npm install
    cd backend-node && npm install

# Start frontend server only (http://localhost:5173)
ui:
    cd frontend && npm run dev

# Start backend server only — Cloudflare Workers local dev (http://localhost:8787)
server:
    cd backend-node && npx wrangler dev

# Start full stack (frontend + backend)
up: install
    @echo "🚀 Starting nhuthungfoto full-stack..."
    (cd backend-node && npx wrangler dev) & (cd frontend && npm run dev) & wait

# Build frontend for production
build:
    cd frontend && npm run build

# Deploy backend to Cloudflare Workers
deploy:
    cd backend-node && npx wrangler deploy

# Run linting and type-checking across the repository
lint:
    cd backend-node && npm run lint
    cd frontend && npm run lint

# Format code across the repository
format:
    cd backend-node && npm run format
    cd frontend && npm run format

# Clean up build artifacts and dependencies
clean:
    @echo "🧹 Cleaning up..."
    rm -rf frontend/dist backend-node/dist
    rm -rf frontend/node_modules backend-node/node_modules
