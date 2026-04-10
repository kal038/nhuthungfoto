---
tags: [career, nhuthungfoto, wfa, job-search, planning]
created: 2026-04-07
status: active
---

# 🎯 Game Plan: Ship → Portfolio → Job

> **North Star**: Ship nhuthungfoto by Apr 28 → Job search May → First offer by June

---

## Phase 1: Ship nhuthungfoto (Apr 7 – Apr 27)

> [!info] Capacity: Full-time, 40+ hrs/week

### Week 1: Foundation → Upload (Apr 7 – Apr 13)

| Day | Focus | Deliverables |
|-----|-------|-------------|
| Mon Apr 7 | DB Schema | All 6 tables + enums + RLS + indexes migrated to Supabase |
| Tue Apr 8 | Auth | Supabase trigger (profiles on signup), login/signup pages, protected routes |
| Wed Apr 9 | API Core | `GET /v1/modules`, `GET /v1/modules/:slug`, `GET /v1/profiles/me`, TanStack Query |
| Thu Apr 10 | Frontend Pages | Modules list, module detail, dashboard shell |
| Fri Apr 11 | Upload Backend | `POST /v1/submissions`, R2 CORS, pre-signed URL flow |
| Sat Apr 12 | Upload Frontend | Drag-drop UI, progress bar, direct-to-R2 upload |
| Sun Apr 13 | Buffer | Landing page polish OR catch up |

- [ ] **Gate**: Sign up → browse modules → upload a photo to R2

### Week 2: Image Pipeline → AI → Credits (Apr 14 – Apr 20)

| Day | Focus | Deliverables |
|-----|-------|-------------|
| Mon Apr 14 | Lambda Worker | AWS Lambda + sharp (resize, WebP, EXIF), SQS queue + trigger |
| Tue Apr 15 | Lambda Integration | Lambda ↔ R2 (read raw, write processed, delete raw) |
| Wed Apr 16 | Credits System | Postgres `spend_credits()`, audit log, `GET /v1/credits/balance` |
| Thu Apr 17 | AI Grading | Gemini Flash integration, prompt engineering, structured JSON |
| Fri Apr 18 | Grading Flow | `POST /v1/submissions/:id/grade`, `GET /v1/submissions/me` |
| Sat Apr 19 | Review UI | Score cards, category breakdown, Vietnamese feedback |
| Sun Apr 20 | Integration Test | End-to-end: upload → process → grade → view feedback |

- [ ] **Gate**: Upload photo → get AI feedback with scores in Vietnamese. Credits deducted.

### Week 3: Payments → Deploy → LIVE (Apr 21 – Apr 27)

| Day | Focus | Deliverables |
|-----|-------|-------------|
| Mon Apr 21 | Payments Backend | `POST /v1/payments/intent`, SePay webhook, signature verify |
| Tue Apr 22 | Payments Frontend | Credits purchase page, QR display, transaction history |
| Wed Apr 23 | Onboarding + Landing | Starter credits trigger, landing page final polish |
| Thu Apr 24 | Production Setup | Supabase prod, CF Pages deploy, CF Workers deploy |
| Fri Apr 25 | AWS Production | Lambda + SQS prod, DNS + SSL, secrets |
| Sat Apr 26 | Smoke Test | Full user journey on production. Bug fixes. |
| Sun Apr 27 | Final Polish | Mobile responsive, error states, loading skeletons |

- [ ] **Gate**: **LIVE** 🚀

---

## Phase 2: Portfolio + GitHub + Users (Apr 28 – May 4)

- [ ] Write case study: architecture diagram, tech decisions, screenshots
- [ ] Add nhuthungfoto as featured project on personal portfolio
- [ ] GitHub polish: README with arch overview, setup instructions, badges, `.env.example`
- [ ] Soft launch: Vietnamese photography Facebook groups, Hùng's network
- [ ] Add analytics (Plausible/GA), OpenGraph meta, sitemap, robots.txt

---

## Phase 3: Job Search (May 5+)

### Where to search (early-stage, seed/Series A)

| Platform | Action |
|----------|--------|
| **workatastartup.com** | YC's board. Filter: Remote, Engineering. One profile → apply to many. |
| **wellfound.com** | Filter: Remote, Seed/Series A, Engineering. |
| **otta.com** | Curated, shows funding stage. |
| **HN "Who's Hiring"** | 1st of every month. Ctrl+F "remote" + "worldwide." |
| **LinkedIn** | Cold DM founders directly. 5/day. |

### What to search for

- 2-15 person teams (engineer #2-5)
- "Remote-first" or "distributed"
- YC / Techstars / known angel-backed
- Building in: fintech, dev tools, AI/ML, SaaS
- Does NOT say "US only" or "EU timezone required"

### Salary expectations (honest)

| Scenario | Range |
|----------|-------|
| Contractor, seed stage | $40-55k + equity (0.1-0.5%) |
| Contractor, Series A | $50-65k + equity |
| Full-time via EOR | $50-75k |
| After 6-12 months back | Renegotiate up 20-30% |

> [!warning] Don't anchor too high. Optimize for **getting hired** after a 1+ year gap, not maximizing comp. First role back is a stepping stone.

### Cold DM template

```
Hi [Name] — saw [Company] on [YC/Wellfound/HN]. I'm an ex-Goldman Sachs
engineer (trading systems) who recently shipped an AI-powered platform
end-to-end solo (nhuthungfoto.com). Based in APAC, GMT+7. Would love to
chat if you're open to distributed engineers. Happy to do a paid trial.
```

### Filter questions for recruiters

- "Do you use an EOR for APAC hires?"
- "Is this truly worldwide or timezone-restricted?"
- "Have you hired in Southeast Asia before?"

---

## Blockers to Resolve TODAY

- [ ] Register SePay account (webhook approval: 3-5 business days)
- [ ] AWS account + IAM credentials for Lambda + SQS
- [ ] Gemini API key from ai.google.dev
- [ ] Domain purchase (before Apr 24)
- [ ] Get 3 module titles + descriptions from Hùng (before Apr 10)

---

## Passive Setup (Do This Week, Evenings Only)

- [ ] Create/update **Arc.dev** profile
- [ ] Create **Wellfound** profile
- [ ] Create **Work at a Startup** profile
- [ ] Create **Otta** profile
- [ ] Update LinkedIn headline → "Software Engineer | Ex-Goldman Sachs | TypeScript + Go + Python | Building AI-powered products"
- [ ] Set email alerts on all platforms: Remote, Engineering, Seed/Series A
- [ ] Bookmark career pages for backup companies

---

## Resume framing

> [!tip] Never say "unemployed" or "upskilling." The narrative is:
> 
> **"Left GS to relocate to Southeast Asia. Built and shipped nhuthungfoto — an AI-powered photography platform — from architecture to production in 3 weeks."**
> 
> - April 2026 – Present: **Founder/Engineer, nhuthungfoto**
> - That's your gap filler. Make it real by shipping it.

### Competitive edge

- GS Trading → low-latency, high-stakes production systems
- TypeScript + Go + Python → full-stack + systems + AI (rare combo)
- Shipped solo: React/Vite, Hono/CF Workers, Gemini AI, AWS Lambda, Supabase
- "I built this in 3 weeks, alone" > any certificate
