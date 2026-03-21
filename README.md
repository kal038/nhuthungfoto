# nhuthungfoto

Photography education platform by Nhựt Hùng — learn photography from a 25+ year veteran educator.

![High-Level Architecture](docs/Diagrams/nhuthungfoto-hld.png)

## Tech Stack

| Layer      | Technology                                 |
| ---------- | ------------------------------------------ |
| Frontend   | React + Vite + Tailwind CSS v4 + shadcn/ui |
| Backend    | Hono on Cloudflare Workers                 |
| Auth       | Supabase                                   |
| Database   | Supabase                                   |
| Storage    | Cloudflare R2                              |
| Payments   | VietQR (SePay) + Momo                      |
| AI Grading | Gemini Flash / GPT-4o-mini                 |
| Booking    | Calendly API                               |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Wrangler CLI (`npm install -g wrangler`)

### Install

```bash
make install
# or
just install
```

### Development

```bash
# Full stack (frontend + backend)
make up
# or
just up

# Frontend only (http://localhost:5173)
make frontend
# or
just frontend

# Backend only — Cloudflare Workers local dev (http://localhost:8787)
make backend
# or
just server
```

### Deploy

```bash
# Deploy backend to Cloudflare Workers
make deploy
# or
just deploy

# Build frontend for production
make build
# or
just build
```

## Project Structure

```
nhuthungfoto-site/
├── frontend/           # React + Vite + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── components/ # shadcn/ui + custom components
│   │   ├── hooks/      # TanStack Query hooks
│   │   ├── lib/        # Utilities
│   │   ├── types/      # TypeScript interfaces
│   │   ├── App.tsx     # Root component
│   │   └── index.css   # Design system tokens + Tailwind
│   └── index.html
├── backend-node/       # Hono on Cloudflare Workers
│   ├── src/
│   │   ├── routes/     # API route handlers
│   │   ├── middleware/  # Auth, validation, rate limiting
│   │   ├── services/   # Business logic
│   │   ├── types/      # Env bindings, shared types
│   │   └── index.ts    # Workers entry point
│   ├── wrangler.jsonc  # Cloudflare Workers config (R2 bindings)
│   ├── .dev.vars       # Local secrets (gitignored)
│   └── .env.example    # Environment reference
├── docs/               # PRD, TDD, Design specs
├── Makefile            # Monorepo orchestration (legacy)
├── Justfile            # Modern command runner
└── README.md
```

## Documentation

- [Technical Design Document](docs/tdd-nhuthungfoto.md)
- [UI/UX Design Specification](docs/DESIGN.md)
- [Product Requirement Document](docs/prd-nhuthungfoto-final.md)
