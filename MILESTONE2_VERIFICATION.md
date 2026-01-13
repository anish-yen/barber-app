# Milestone 2 Verification Steps

## Files Created/Modified

### Database Migration
- `supabase/migrations/002_create_waitlist_entries.sql` - Waitlist entries table (no position column, computed dynamically)

### API Routes
- `app/api/waitlist/join/route.ts` - POST endpoint to join waitlist
- `app/api/waitlist/status/route.ts` - GET endpoint to get user's waitlist status

### Pages
- `app/waitlist/page.tsx` - Full waitlist UI with join form and status display

---

## Database Setup

### 1. Run Migration
1. Go to Supabase Dashboard > SQL Editor
2. Run the migration: `supabase/migrations/002_create_waitlist_entries.sql`
3. Verify table created: Go to Table Editor > `waitlist_entries`

### Expected Table Structure:
- `id` (UUID, primary key)
- `customer_id` (UUID, references profiles)
- `guest_count` (INTEGER, 1 or 2)
- `notification_sent` (BOOLEAN, default false)
- `joined_at` (TIMESTAMP)
- `served_at` (TIMESTAMP, nullable)
- Constraint: `unique_active_customer` (prevents duplicate active entries)

---

## Verification Steps

### Test 1: Join Waitlist (First Customer)
1. Start dev server: `npm run dev`
2. Login as a customer (or sign up new customer account)
3. Navigate to `/waitlist`
4. Select guest count: "1 person (just me)" or "2 people (me + 1 friend)"
5. Click "Join Waitlist"
6. **Expected Results:**
   - ✅ Button shows "Joining..." then changes back
   - ✅ UI shows "Your Status" section with:
     - Your Position: **1**
     - Queue Length: **1**
     - Guests: **1** or **2** (depending on selection)
   - ✅ No error messages

### Test 2: Prevent Duplicate Join
1. While already on the waitlist (from Test 1)
2. Try to join again (form should not be visible, but if you see it, click "Join Waitlist")
3. **Expected Results:**
   - ✅ Error message: "You are already on the waitlist"
   - ✅ Status still shows your existing position
   - ✅ No duplicate entry created in database

### Test 3: Multiple Customers Join (Position Calculation)
1. Open browser in **incognito/private window** (or use different browser)
2. Sign up a second customer account (e.g., `customer2@test.com`)
3. Login as second customer
4. Navigate to `/waitlist`
5. Join waitlist (select any guest count)
6. **Expected Results:**
   - ✅ Second customer sees:
     - Your Position: **2**
     - Queue Length: **2**
   - ✅ First customer (in other browser) should see:
     - Your Position: **1**
     - Queue Length: **2**

### Test 4: Guest Count Selection
1. Create a new customer account (or use existing)
2. Navigate to `/waitlist`
3. Select "2 people (me + 1 friend)"
4. Join waitlist
5. **Expected Results:**
   - ✅ Status shows "Guests: 2"
   - ✅ Database shows `guest_count = 2` for this entry

### Test 5: Queue Length Display
1. Have multiple customers on waitlist (from previous tests)
2. As any customer, view `/waitlist`
3. **Expected Results:**
   - ✅ Queue Length shows correct total (e.g., if 3 customers joined, shows 3)
   - ✅ Your Position shows your position in that queue

### Test 6: Position Calculation (FIFO Ordering)
1. Clear all waitlist entries (manually delete from Supabase Table Editor, or wait for Milestone 3)
2. Join as Customer A
3. Wait 2 seconds
4. Join as Customer B
5. Wait 2 seconds
6. Join as Customer C
7. **Expected Results:**
   - ✅ Customer A: Position 1
   - ✅ Customer B: Position 2
   - ✅ Customer C: Position 3
   - ✅ All show Queue Length: 3
   - ✅ Positions are based on `joined_at` timestamp (FIFO)

### Test 7: No Position Column in Database
1. Go to Supabase Dashboard > Table Editor > `waitlist_entries`
2. View table structure
3. **Expected Results:**
   - ✅ No `position` column exists
   - ✅ Position is computed dynamically (verified in API response)

### Test 8: RLS Policies
1. Login as customer
2. Try to access another customer's waitlist entry (via API or direct query)
3. **Expected Results:**
   - ✅ Customers can only see their own entries
   - ✅ Barber can see all entries (test in Milestone 3)

---

## Database Verification (Optional)

### Check Database Directly:
```sql
-- View all active entries (as barber or in SQL editor)
SELECT 
  id,
  customer_id,
  guest_count,
  joined_at,
  served_at
FROM waitlist_entries
WHERE served_at IS NULL
ORDER BY joined_at ASC;
```

### Verify Position Calculation:
Position should be: COUNT(*) of entries WHERE served_at IS NULL AND joined_at <= my joined_at

---

## Common Issues & Solutions

### Issue: "relation 'waitlist_entries' does not exist"
- **Solution:** Run the migration file in Supabase SQL Editor

### Issue: "new row violates row-level security policy"
- **Solution:** Check that RLS policies were created correctly in migration

### Issue: "You are already on the waitlist" but no entry visible
- **Solution:** Check database for entries with `served_at IS NULL` for your customer_id

### Issue: Position calculation seems wrong
- **Solution:** Verify entries are ordered by `joined_at` ASC, check timestamps in database

### Issue: Cannot join - error 401
- **Solution:** Make sure you're logged in, check auth session

---

## Acceptance Criteria Checklist

- ✅ Customer can join waitlist (guest_count = 1 or 2)
- ✅ Cannot join twice (shows existing position)
- ✅ Position displayed correctly (calculated dynamically)
- ✅ Queue length displayed correctly
- ✅ No position column in database (computed from joined_at)
- ✅ RLS policies enforce security

---

**Milestone 2 Complete!** Ready for Milestone 3 when you are.

