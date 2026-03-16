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
frontend:
    cd frontend && npm run dev

# Start backend server only (http://localhost:3001)
backend:
    cd backend-node && npm run dev

# Start full stack (frontend + backend)
up: install
    @echo "🚀 Starting nhuthungfoto full-stack..."
    (cd backend-node && npm run dev) & (cd frontend && npm run dev) & wait

# Build both applications for production
build:
    cd backend-node && npm run build
    cd frontend && npm run build

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
