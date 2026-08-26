# Admin Grading Walkthrough

How Hùng grades student submissions through the admin-lite UI.

## What was built

```
Student submits + pays 3 credits (review_type=HUNG)
        │
        ▼
status = AWAITING_HUNG          ← spend_and_start_grading flips directly
        │                        (AI and HUNG grading are either/or)
        ▼
┌───────────────────────────────────────────────┐
│  ADMIN QUEUE   GET /v1/admin/queue            │
│  /admin/queue — oldest-first list of cards    │
└───────────────────┬───────────────────────────┘
                    │ click card / prev / next
                    ▼
┌───────────────────────────────────────────────┐
│  GRADE PAGE   GET /v1/admin/queue/:id         │
│  /admin/grade/$id                             │
│  photo + student info + grading form          │
│  POST /v1/admin/queue/:id/review              │
│    → reviews row inserted                     │
│    → status flipped to COMPLETED (atomic RPC) │
│    → auto-advance to next queued submission   │
└───────────────────────────────────────────────┘
        │
        ▼
Student hub (/submissions) shows "Đã chấm"
→ "Xem đánh giá" dialog (score /10 + category bars + comments)
```

## Files

| Layer | File | Purpose |
|---|---|---|
| Hook | `frontend/src/hooks/queries/useAdminQueue.ts` | `useAdminQueue()`, `useAdminSubmission(id)` + response types |
| Hook | `frontend/src/hooks/mutations/useSubmitReview.ts` | `useSubmitReviewMutation()` — POST review, invalidates caches |
| Hook | `frontend/src/hooks/queries/useIsAdmin.ts` | Gate flag from `GET /v1/admin/me` |
| UI | `frontend/src/components/features/admin/AdminSubmissionCard.tsx` | Queue card (thumb, student, module, wait badge) |
| UI | `frontend/src/components/features/admin/AdminGradingForm.tsx` | Overall + 5 category sliders (1–10), required comment |
| Route | `frontend/src/routes/admin/queue.tsx` | Queue page |
| Route | `frontend/src/routes/admin/grade.$id.tsx` | Grading detail page |
| Layout | `frontend/src/components/features/profile/AccountLayout.tsx` | Conditional "Chấm bài" sidebar link |
| Backend | `backend/src/routes/admin.ts`, `backend/src/middleware/isAdmin.ts` | Endpoints + email allowlist authz |

## Setup

Grading access is an **env-var email allowlist** (comma-separated, case-insensitive):

```bash
# local dev — backend/.dev.vars
ADMIN_EMAILS="hung@example.com,khoi@example.com"

# production
wrangler secret put ADMIN_EMAILS
```

The frontend learns admin status from `GET /v1/admin/me` (`useIsAdmin`,
cached for the session). Non-admins get a "Không có quyền truy cập" fallback;
the sidebar link is hidden entirely.

## Grading flow

1. Log in as Hùng → sidebar shows **Chấm bài** → `/admin/queue`.
2. Queue lists `AWAITING_HUNG` submissions **oldest first**, each card showing
   photo, student, module, and a wait badge (red once ≥ 1 day).
3. Click a card → `/admin/grade/$id`: large photo, student/module panel, form.
4. Set **Điểm tổng kết** (1–10) + five category sliders (Bố cục, Phơi sáng,
   Sáng tạo, Kể chuyện, Lấy nét), write the critique (**required**).
5. **Gửi đánh giá** → review saved atomically, status → COMPLETED, then the
   page **auto-advances to the next queued submission** (or back to the queue
   when done). Prev/next arrows jump between queue items without going back.

### Scale

Scores are **integers 1–10 everywhere**: DB CHECK (`reviews_overall_score_check`),
zod (`gradingRequestSchema`), sliders, display. No decimals accepted at any layer.
Storage note: `reviews.overall_score` stores 1–10; the student card renders it
directly with a `/10` label.

## Design notes

- **Render-time navigation**: `grade.$id` computes `prevId`/`nextId` once per id
  from the cached queue via `queryClient.getQueryData(['admin','queue'])`. After
  submit the mutation invalidates that cache — re-reading post-submit would race
  the refetch, so navigation uses the precomputed value only.
- **Double-submit protection**: backend RPC locks the submission row; a second
  POST gets `409` which surfaces as an inline error in the form.
- **No polling**: the student hub refetches on window focus + manual refresh;
  grading takes hours so background polling would be waste.

## QA checklist

Setup: two accounts — one in `ADMIN_EMAILS`, one not.

- [ ] Non-admin: no "Chấm bài" sidebar link; direct URL `/admin/queue` → refusal screen
- [ ] Admin: queue shows AWAITING_HUNG items oldest-first, count badge correct
- [ ] Empty queue → "Hàng chờ trống" state
- [ ] Grade page: photo loads, student/module/waiting info correct
- [ ] Submit blocked while comment empty
- [ ] Submit → advances to next item; graded item gone from queue on return
- [ ] Prev/next arrows disabled at queue edges and work otherwise
- [ ] Direct URL to already-COMPLETED submission → "không còn chờ chấm" fallback
- [ ] Rapid double submit → inline error, no crash
- [ ] Student side: completed submission shows "Đã chấm" → review dialog with score/bars/comment

## Seeding a finished grade (SQL editor)

```sql
-- flip an existing submission into the queue
update submissions set status = 'AWAITING_HUNG', review_type = 'HUNG'
where id = '<submission_id>';

-- grade via the same RPC the admin route uses
select admin_submit_review(
  '<submission_id>',
  8,
  '{"composition":8,"exposure":7,"creativity":9,"storytelling":8,"focus":8}'::jsonb,
  'Bố cục tốt, cân nhắc thêm khoảng âm.'
);
```

## Troubleshooting

| Symptom | Cause |
|---|---|
| 403 / refusal screen | Account email not in `ADMIN_EMAILS` (check lowercase, commas) |
| Empty queue but submissions exist | Submissions not in `AWAITING_HUNG` (e.g. still `UPLOADED`) |
| "Không gửi được đánh giá" | Submission left AWAITING_HUNG state (already graded elsewhere) — refresh queue |
| Sidebar link missing after email change | `useIsAdmin` cached for session — reload the page |
