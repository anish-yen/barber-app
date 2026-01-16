# Barber Waitlist MVP (Single-barber) — PROJECT_CONTEXT

Last updated: 2026-01-15

## One-sentence summary
A single-barber waitlist app where customers can join a queue and get notifications, and the barber controls weekly hours + closures that gate whether customers can join.

---

## Stack
- Next.js 14 App Router + TypeScript + Tailwind
- Supabase (Auth + Postgres + RLS)
- Resend (email)
- Deployed on Vercel

---

## Current status
Milestone 8 implemented: schedule-gated waitlist (weekly hours + closures) and status fields exposed to customers.
Production issues resolved: barber resolution via env var, schedule time nullability fixed.

Known follow-up bug (to fix during Milestone 9): schedule date uses UTC string (`toISOString`) while day-of-week uses local time; switch to local date formatting in `lib/schedule.ts` to avoid day shift.

---

## Core product behavior
### Roles
- Barber: manages schedule, closures, announcements, and serves next customer.
- Customer: joins/leaves waitlist, sees position, sees announcements, sees open/closed status.

### Waitlist
- Join creates a `waitlist_entries` record.
- Leave removes or marks inactive depending on implementation.
- Serve-next advances the queue.
- Email notify: when a user reaches position 3 (uses service role/admin read).

### Schedule gating (Milestone 8)
- Weekly schedule: `barber_hours` with fields:
  - barber_id (uuid)
  - day_of_week (0=Sunday … 6=Saturday)
  - is_open (bool)
  - start_time (time, nullable when closed)
  - end_time (time, nullable when closed)
- Closures: `barber_closures` (one-off dates)
  - date (YYYY-MM-DD), is_closed, reason
- Customers can only join when open.
- `/api/waitlist/status` returns schedule fields even if not on waitlist:
  - isOpenNow
  - todayHoursText
  - nextOpenText

### Barber resolution (Single-barber MVP)
- Barber is selected by env var:
  - `NEXT_PUBLIC_BARBER_ID` must be set in Vercel Project env vars
- Barber schedule management uses logged-in barber `user.id` for writes.
- Customer-facing status/join uses `getBarberId()` which returns env barber id.

---

## Key routes
### Customer pages
- `/` home
- `/login` `/signup`
- `/waitlist`
- `/announcements`

### Barber pages
- `/barber/dashboard`
- `/barber/announcements`
- `/barber/schedule`

---

## API routes
- `/api/waitlist/join` (blocks with 403 if closed)
- `/api/waitlist/status` (returns queue + schedule status)
- `/api/waitlist/leave`
- `/api/waitlist/queue`
- `/api/waitlist/serve-next`

- `/api/announcements` (+ `unread-count`, `mark-all-read`)

- `/api/barber/hours` (GET/POST weekly hours)
- `/api/barber/closures` (POST add/remove closure)

---

## DB tables
- `profiles` (id, email, role)
- `waitlist_entries`
- `announcements`
- `announcement_reads`
- `barber_hours`
- `barber_closures`

---

## Env vars (Vercel + local)
Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_BARBER_ID` (single-barber MVP)

---

## Recent fixes / decisions
- `barber_hours.start_time` and `end_time` must be nullable when `is_open=false` (DB constraint updated).
- `lib/schedule.ts` updated to handle null start/end times safely.
- `lib/getBarberId.ts` made deterministic for MVP: returns `process.env.NEXT_PUBLIC_BARBER_ID` or throws.
- Production debug: env var must be attached to the Vercel PROJECT (not just team scope), then redeploy.

---

## Next milestone plan
### Milestone 9: “Baller Mode” (no Stripe yet)
Goal: Add priority queue as a monetization demo.
- Add `priority_level` to waitlist entries (default 0).
- Queue ordering: higher priority served first; tie-breaker by created_at.
- VIP activation methods:
  - VIP code (e.g. `DAZVIP`) when joining
  - Barber toggle/promote in dashboard (manual)
- Include schedule UTC/local date fix in the same milestone:
  - change `formatDate` to local YYYY-MM-DD (avoid `toISOString()`)

After Milestone 9:
- UI polish via v0.dev (layout only, wire existing logic)
- Barber outreach DMs
