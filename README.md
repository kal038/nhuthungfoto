# nhuthungfoto

Photography education platform by Nhựt Hùng — learn photography from a 25+ year veteran educator.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS v4 + shadcn/ui |
| Backend | Node.js + TypeScript + Express |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Database | Supabase PostgreSQL |
| Storage | AWS S3 (ap-southeast-1) |
| Payments | VietQR (SePay) + Momo |
| AI Grading | Gemini Flash / GPT-4o-mini |
| Booking | Calendly API |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
make install
```

### Development

```bash
# Full stack (frontend + backend)
make up

# Frontend only (http://localhost:5173)
make frontend

# Backend only (http://localhost:3001)
make backend
```

### Build

```bash
make build
```

## Project Structure

```
nhuthungfoto-site/
├── frontend/           # React + Vite + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── components/ # shadcn/ui + custom components
│   │   ├── lib/        # Utilities
│   │   ├── App.tsx     # Root component
│   │   └── index.css   # Design system tokens + Tailwind
│   └── index.html
├── backend-node/       # Express API server
│   ├── src/
│   │   ├── routes/     # API route handlers
│   │   ├── middleware/  # Auth, validation, rate limiting
│   │   ├── services/   # Business logic
│   │   └── index.ts    # Server entry point
│   └── .env.example    # Environment template
├── docs/               # PRD, TDD, Design specs
├── Makefile            # Monorepo orchestration
└── README.md
```

## Documentation

- [Technical Design Document](docs/tdd-nhuthungfoto.md)
- [UI/UX Design Specification](docs/DESIGN.md)
