# Barber Waitlist MVP - Implementation Plan

**Goal:** Build the simplest sellable MVP for a single-barber waitlist app (Daz).

---

## 1. Architecture Overview

### Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (Auth + PostgreSQL)
- **Email:** Resend API
- **Deployment:** Vercel
- **All free tiers only**

### High-Level Flow
```
Customer Journey:
1. Visit landing page (/)
2. Sign up/Sign in
3. Join waitlist (/waitlist) → enters queue
4. View position in queue
5. Receive email when position = 3
6. View announcements (/announcements)

Barber Journey:
1. Sign up as barber (role assignment)
2. Login
3. View/manage waitlist (/barber/dashboard)
4. Mark customers as "served" (remove from queue)
5. Post announcements (/barber/announcements)
```

### Key Design Decisions
- Single-barber app (hardcoded barber ID or single barber account)
- No appointments = real-time queue only
- Email-only notifications (no SMS)
- FIFO queue ordering
- One email per customer per queue position = 3

---

## 2. Database Schema (Supabase PostgreSQL)

### Table: `users` (Supabase Auth)
- Managed by Supabase Auth
- Stores email, password hash, etc.

### Table: `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('barber', 'customer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for role lookups
CREATE INDEX idx_profiles_role ON profiles(role);
```

### Table: `waitlist_entries`
```sql
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count >= 1),
  position INTEGER NOT NULL, -- Calculated field, updated on insert/delete
  notification_sent BOOLEAN DEFAULT FALSE, -- Flag for position = 3 email
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  served_at TIMESTAMP WITH TIME ZONE, -- NULL until served
  
  -- Ensure one active entry per customer
  CONSTRAINT unique_active_customer UNIQUE NULLS NOT DISTINCT (customer_id, served_at)
);

-- Index for ordering by position
CREATE INDEX idx_waitlist_position ON waitlist_entries(position) WHERE served_at IS NULL;

-- Index for customer lookups
CREATE INDEX idx_waitlist_customer ON waitlist_entries(customer_id);
```

**Position Calculation Logic:**
- Position = MAX(position) + 1 for new entries
- When customer is served, remaining entries shift down (position -= 1)
- Or: Position = ROW_NUMBER() OVER (ORDER BY joined_at) WHERE served_at IS NULL

### Table: `announcements`
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for chronological ordering
CREATE INDEX idx_announcements_created ON announcements(created_at DESC);
```

### Table: `announcement_reads`
```sql
CREATE TABLE announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One read record per customer per announcement
  UNIQUE(customer_id, announcement_id)
);

-- Index for unread count queries
CREATE INDEX idx_announcement_reads_customer ON announcement_reads(customer_id, announcement_id);
```

### Functions & Triggers

**Function: Calculate Waitlist Position**
```sql
-- Function to recalculate positions after serve/delete
CREATE OR REPLACE FUNCTION recalculate_waitlist_positions()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE waitlist_entries
  SET position = sub.row_num
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY joined_at) as row_num
    FROM waitlist_entries
    WHERE served_at IS NULL
  ) sub
  WHERE waitlist_entries.id = sub.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger after update/delete
CREATE TRIGGER trigger_recalculate_positions
AFTER UPDATE OF served_at ON waitlist_entries
FOR EACH ROW
WHEN (OLD.served_at IS NULL AND NEW.served_at IS NOT NULL)
EXECUTE FUNCTION recalculate_waitlist_positions();
```

**Function: Check Email Notification Trigger**
```sql
-- Function to check if position = 3 and send email (called from app)
-- Logic: When position becomes 3 AND notification_sent = FALSE, trigger email
-- This will be handled in Next.js API route, not in DB trigger
```

---

## 3. Auth + Role Handling

### Authentication Flow
1. **Sign Up:**
   - Customer: `/signup` → Supabase Auth signup → Create profile with `role = 'customer'`
   - Barber: Special signup flow (e.g., `/signup?role=barber` or hardcoded email check)
   - Alternative: First barber account created manually in DB, rest are customers

2. **Login:**
   - `/login` → Supabase Auth signin → Redirect based on role:
     - `role = 'barber'` → `/barber/dashboard`
     - `role = 'customer'` → `/waitlist`

3. **Role Checking:**
   - Middleware: Check `profile.role` from Supabase
   - Protect routes: `/barber/*` requires `role = 'barber'`
   - Customer routes: `/waitlist`, `/announcements` require auth

### Implementation Details
- Use Supabase client-side auth helpers
- Server-side: `createServerClient` for route handlers/middleware
- Store role in `profiles` table (single source of truth)
- Create profile on first signup (trigger or app logic)

---

## 4. Waitlist Ordering Logic

### Join Waitlist
1. Customer clicks "Join Waitlist"
2. Check if customer already has active entry (`served_at IS NULL`)
3. If exists: Show current position (no duplicate)
4. If not: Insert new entry with:
   - `customer_id` = current user ID
   - `guest_count` = 1 (or user input +1 friend)
   - `position` = `(SELECT COUNT(*) FROM waitlist_entries WHERE served_at IS NULL) + 1`
   - `joined_at` = NOW()
   - `notification_sent` = FALSE
5. Check if position = 3 → Trigger email (if not sent)

### Serve Next Customer
1. Barber clicks "Serve Next"
2. Find first entry: `SELECT * FROM waitlist_entries WHERE served_at IS NULL ORDER BY position ASC LIMIT 1`
3. Update: `UPDATE waitlist_entries SET served_at = NOW() WHERE id = <entry_id>`
4. Trigger recalculates positions for all remaining entries
5. Check all entries with `position = 3` and `notification_sent = FALSE` → Send emails

### Position Calculation Options

**Option A: Stored Position (Recommended for MVP)**
- Store `position` as integer
- Recalculate on serve: `UPDATE ... SET position = position - 1 WHERE position > <served_position>`
- Pros: Simple queries, fast reads
- Cons: Needs recalculation logic

**Option B: Calculated Position (Dynamic)**
- Position = `ROW_NUMBER() OVER (ORDER BY joined_at) WHERE served_at IS NULL`
- No stored position field
- Pros: Always accurate, no recalculation
- Cons: Slightly more complex queries

**Recommendation:** Option A for MVP (simpler, good enough)

### Queue Display
- Customer view: Show their position, total queue length
- Barber view: Show all entries ordered by position (1, 2, 3, ...)

---

## 5. Email Trigger Logic

### When to Send
- Trigger when a customer's position **becomes 3** (only 2 people ahead)
- Send **only once** per queue entry (`notification_sent = FALSE`)
- Send after position recalculation (when someone is served)

### Email Flow
1. **After "Serve Next":**
   - Recalculate positions
   - Find entries with `position = 3 AND notification_sent = FALSE`
   - Send email via Resend API
   - Update `notification_sent = TRUE`

2. **After "Join Waitlist" (if position = 3 immediately):**
   - Check if new entry position = 3
   - Send email immediately
   - Update `notification_sent = TRUE`

### Email Content (Resend)
- To: Customer email (from `profiles.email`)
- Subject: "You're almost up - only 2 ahead of you!"
- Body: Simple HTML/text with queue position info

### Implementation
- Next.js API route: `/api/waitlist/serve-next` (barber action)
- Next.js API route: `/api/waitlist/send-notifications` (check and send)
- Resend API integration in API route
- Environment variable: `RESEND_API_KEY`

---

## 6. RLS Rules (High-Level)

### Profiles Table
- Users can read their own profile
- Users can update their own profile (limited fields)
- Barber can read all profiles (for waitlist)

### Waitlist Entries
- Customers: Can read their own entry
- Customers: Can create their own entry (one active)
- Customers: Cannot delete/serve entries
- Barber: Can read all entries
- Barber: Can update `served_at` (serve next)

### Announcements
- Everyone: Can read all announcements
- Barber: Can create/update/delete announcements
- Customers: Cannot modify announcements

### Announcement Reads
- Customers: Can read/create their own reads
- Barber: Can read all reads (for analytics)

**Note:** RLS rules should be implemented in Supabase dashboard or via migrations. Detailed SQL not included here (implement in milestone).

---

## 7. Step-by-Step Milestones

### Milestone 1: Project Setup + Auth
**Goal:** Get Next.js + Supabase auth working with role-based login

**Tasks:**
1. Initialize Next.js project (App Router, TypeScript, Tailwind)
2. Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`
3. Set up Supabase project
4. Create `profiles` table + RLS
5. Create signup/login pages
6. Implement profile creation on signup
7. Test: Sign up as customer → redirect to `/waitlist`
8. Test: Sign up as barber → redirect to `/barber/dashboard`

**Acceptance Criteria:**
- ✅ Can sign up as customer or barber
- ✅ Role stored in `profiles` table
- ✅ Login redirects based on role
- ✅ Protected routes work (middleware)

**Files to Create:**
- `app/layout.tsx`
- `app/page.tsx` (landing)
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/waitlist/page.tsx` (placeholder)
- `app/barber/dashboard/page.tsx` (placeholder)
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `middleware.ts`

---

### Milestone 2: Waitlist Core (Join + View)
**Goal:** Customers can join waitlist and see their position

**Tasks:**
1. Create `waitlist_entries` table + RLS
2. Create API route: `POST /api/waitlist/join`
3. Create API route: `GET /api/waitlist/status` (customer's position)
4. Build `/waitlist` page UI:
   - Show current position
   - Show total queue length
   - "Join Waitlist" button
   - Guest count selector (+1 friend option)
5. Implement join logic (prevent duplicates)
6. Test: Multiple customers join → positions assigned correctly

**Acceptance Criteria:**
- ✅ Customer can join waitlist (guest_count = 1 or 2)
- ✅ Cannot join twice (show existing position)
- ✅ Position displayed correctly
- ✅ Queue length displayed

**Files to Create/Update:**
- `app/api/waitlist/join/route.ts`
- `app/api/waitlist/status/route.ts`
- `app/waitlist/page.tsx` (full UI)

---

### Milestone 3: Barber Dashboard (Serve Next)
**Goal:** Barber can view queue and serve customers

**Tasks:**
1. Create API route: `GET /api/waitlist/queue` (all entries for barber)
2. Create API route: `POST /api/waitlist/serve-next`
3. Build `/barber/dashboard` page UI:
   - List all active entries (ordered by position)
   - Show customer email, guest_count, joined_at
   - "Serve Next" button (serves position 1)
4. Implement position recalculation after serve
5. Test: Serve customer → positions update correctly

**Acceptance Criteria:**
- ✅ Barber sees all active entries in order
- ✅ "Serve Next" removes first entry
- ✅ Remaining entries shift positions (1, 2, 3 → 1, 2)
- ✅ Served entries no longer appear

**Files to Create/Update:**
- `app/api/waitlist/queue/route.ts`
- `app/api/waitlist/serve-next/route.ts`
- `app/barber/dashboard/page.tsx` (full UI)

---

### Milestone 4: Email Notifications
**Goal:** Send email when customer position = 3

**Tasks:**
1. Install Resend SDK
2. Set up Resend API key (env var)
3. Create email template (HTML)
4. Create API route: `/api/emails/send-notification`
5. Integrate email trigger in:
   - `POST /api/waitlist/serve-next` (after position recalculation)
   - `POST /api/waitlist/join` (if position = 3 immediately)
6. Update `notification_sent` flag after sending
7. Test: Join as 3rd person → email sent
8. Test: Serve customer → 3rd person gets email

**Acceptance Criteria:**
- ✅ Email sent when position becomes 3
- ✅ Email sent only once per entry
- ✅ Email contains queue position info
- ✅ `notification_sent` flag updated

**Files to Create/Update:**
- `app/api/emails/send-notification/route.ts`
- `lib/resend.ts`
- Update `app/api/waitlist/serve-next/route.ts`
- Update `app/api/waitlist/join/route.ts`

---

### Milestone 5: Announcements
**Goal:** Barber posts announcements, customers view them

**Tasks:**
1. Create `announcements` table + RLS
2. Create `announcement_reads` table + RLS
3. Create API routes:
   - `GET /api/announcements` (all announcements)
   - `POST /api/announcements` (barber only)
   - `GET /api/announcements/unread-count`
   - `POST /api/announcements/:id/read`
4. Build `/barber/announcements` page:
   - Form to create announcement (title + message)
   - List existing announcements
5. Build `/announcements` page:
   - List all announcements (newest first)
   - Mark as read on view
   - Show unread count badge
6. Add bell icon to customer nav (unread count)

**Acceptance Criteria:**
- ✅ Barber can create announcements
- ✅ Customers see all announcements
- ✅ Unread count updates correctly
- ✅ Announcements ordered by newest first

**Files to Create/Update:**
- `app/api/announcements/route.ts`
- `app/api/announcements/unread-count/route.ts`
- `app/api/announcements/[id]/read/route.ts`
- `app/barber/announcements/page.tsx`
- `app/announcements/page.tsx`

---

### Milestone 6: Landing Page + Polish
**Goal:** Professional landing page and final touches

**Tasks:**
1. Design landing page (`/`):
   - Barber name: "Daz"
   - Brief description
   - "Join Waitlist" CTA (if not logged in → signup)
   - "Barber Login" link
2. Add navigation header (customer/barber views)
3. Add loading states
4. Add error handling
5. Test all flows end-to-end
6. Fix any UI/UX issues

**Acceptance Criteria:**
- ✅ Landing page looks professional
- ✅ Navigation works correctly
- ✅ All flows tested and working
- ✅ No console errors

**Files to Create/Update:**
- `app/page.tsx` (full landing page)
- `components/Nav.tsx` (navigation)
- Add loading/error states to all pages

---

### Milestone 7: Deployment
**Goal:** Deploy to production (Vercel + Supabase)

**Tasks:**
1. Set up Vercel project
2. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for admin operations if needed)
   - `RESEND_API_KEY`
3. Run Supabase migrations in production
4. Deploy to Vercel
5. Test production deployment
6. Set up custom domain (optional)

**Acceptance Criteria:**
- ✅ App deployed to Vercel
- ✅ All environment variables set
- ✅ Production database migrations run
- ✅ All features work in production

---

## 8. Deployment Checklist

### Supabase Setup
- [ ] Create Supabase project
- [ ] Run all SQL migrations (tables, functions, triggers, RLS)
- [ ] Set up email auth (Supabase Auth settings)
- [ ] Configure email templates (optional)
- [ ] Test database connections

### Vercel Setup
- [ ] Connect GitHub repo to Vercel
- [ ] Set environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `RESEND_API_KEY`
- [ ] Configure build settings (Next.js defaults)
- [ ] Deploy

### Resend Setup
- [ ] Create Resend account
- [ ] Create API key
- [ ] Verify sender domain (or use default)
- [ ] Test email sending

### Post-Deployment
- [ ] Test signup/login in production
- [ ] Test waitlist join/serve
- [ ] Test email notifications
- [ ] Test announcements
- [ ] Check error logs
- [ ] Test on mobile device

---

## 9. "How to Clone This for Another Barber" Checklist

### Step 1: Database Setup
- [ ] Create new Supabase project
- [ ] Run all SQL migrations from original project
- [ ] Create first barber profile (manually or via signup)

### Step 2: Code Changes
- [ ] Clone repository
- [ ] Update landing page (`app/page.tsx`): Change "Daz" to new barber name
- [ ] Update any hardcoded references to barber name
- [ ] Update environment variables (new Supabase project)

### Step 3: Services
- [ ] Set up new Resend account (or reuse with different sender)
- [ ] Update email sender name/address

### Step 4: Deploy
- [ ] Create new Vercel project
- [ ] Set environment variables
- [ ] Deploy
- [ ] Test all features

### Step 5: Customization (Optional)
- [ ] Update branding/colors (Tailwind config)
- [ ] Update domain name
- [ ] Customize email templates

**Note:** For true SaaS (multi-barber), would need:
- Multi-tenancy (barber_id in all tables)
- Subdomain/domain routing
- Tenant isolation (RLS by barber_id)
- Not in scope for MVP

---

## 10. Additional Notes

### Edge Cases to Handle
- Customer tries to join twice → Show existing position
- Barber serves when queue is empty → Show "No customers"
- Email send fails → Log error, don't block serve action
- Position calculation race conditions → Use transactions/locks

### Security Considerations
- RLS enabled on all tables
- API routes check auth + roles
- No sensitive data in client components
- Resend API key server-side only

### Performance
- Indexes on frequently queried fields (position, customer_id, etc.)
- Client-side caching for announcements (SWR/React Query optional)
- Efficient position calculation (avoid N+1 queries)

### Future Enhancements (Not in MVP)
- Real-time updates (Supabase Realtime)
- SMS notifications
- Appointments
- Payments
- Multi-barber SaaS

---

## Summary

**Total Milestones:** 7
**Estimated Complexity:** Medium
**Key Files:** ~20-25 files (pages + API routes + lib)
**Database Tables:** 4 tables + Auth users
**External Services:** Supabase, Resend

**Ready to start building?** Say "build milestone 1" when ready.

