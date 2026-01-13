# Milestone 3 Verification Steps

## Files Created/Modified

### API Routes
- `app/api/waitlist/queue/route.ts` - GET endpoint to fetch all active waitlist entries (barber-only)
- `app/api/waitlist/serve-next/route.ts` - POST endpoint to serve the next customer (barber-only)

### Pages
- `app/barber/dashboard/page.tsx` - Full dashboard UI with queue display and "Serve Next" button

---

## Verification Steps

### Test 1: Barber Dashboard Access
1. Login as barber account
2. Navigate to `/barber/dashboard`
3. **Expected Results:**
   - ✅ Dashboard loads without errors
   - ✅ Shows "Barber Dashboard" heading
   - ✅ Shows queue count (e.g., "Queue (0 customers)")

### Test 2: View Empty Queue
1. As barber, go to `/barber/dashboard`
2. Ensure no customers are on waitlist (or clear waitlist)
3. **Expected Results:**
   - ✅ Shows "No customers in the queue" message
   - ✅ "Serve Next" button is disabled

### Test 3: View Queue with Customers
1. **Setup:** Have at least 2-3 customers join the waitlist (use customer accounts)
2. As barber, go to `/barber/dashboard`
3. **Expected Results:**
   - ✅ Queue table displays all active entries
   - ✅ Entries are ordered by `joined_at` (FIFO - first joined appears first)
   - ✅ Table shows columns:
     - Position (1, 2, 3, etc.)
     - Email (customer email address)
     - Guests (1 or 2)
     - Joined At (formatted timestamp)
   - ✅ Queue count shows correct number (e.g., "Queue (3 customers)")

### Test 4: Serve Next Customer
1. **Setup:** Have at least 2 customers on waitlist
2. As barber, go to `/barber/dashboard`
3. Note the first customer's email (should be position 1)
4. Click "Serve Next" button
5. **Expected Results:**
   - ✅ Button shows "Serving..." while processing
   - ✅ Queue refreshes automatically
   - ✅ First customer (position 1) is removed from queue
   - ✅ Remaining customers shift up (position 2 → position 1, position 3 → position 2, etc.)
   - ✅ Queue count decreases by 1
   - ✅ "Serve Next" button is enabled (if queue not empty)

### Test 5: Serve Multiple Customers (Position Shifting)
1. **Setup:** Have 3 customers on waitlist
2. As barber, note all 3 customer emails and their order
3. Click "Serve Next" (serves customer 1)
4. **Expected Results:**
   - ✅ Customer 1 removed
   - ✅ Customer 2 now shows as Position 1
   - ✅ Customer 3 now shows as Position 2
5. Click "Serve Next" again (serves customer 2)
6. **Expected Results:**
   - ✅ Customer 2 removed
   - ✅ Customer 3 now shows as Position 1
   - ✅ Queue length is 1

### Test 6: Serve Last Customer
1. **Setup:** Have 1 customer on waitlist
2. As barber, click "Serve Next"
3. **Expected Results:**
   - ✅ Customer is served
   - ✅ Queue shows "No customers in the queue"
   - ✅ "Serve Next" button is disabled

### Test 7: Serve Next When Queue Empty
1. **Setup:** Ensure queue is empty
2. As barber, try to click "Serve Next" (should be disabled)
3. If somehow triggered, **Expected Results:**
   - ✅ Error message: "No customers in queue"
   - ✅ Queue remains empty

### Test 8: Customer Position Updates After Serve
1. **Setup:** Have 2 customers on waitlist (Customer A and Customer B)
2. As Customer A, check `/waitlist` - should show Position 1
3. As Customer B, check `/waitlist` - should show Position 2
4. As barber, serve Customer A
5. As Customer B, refresh `/waitlist`
6. **Expected Results:**
   - ✅ Customer B now shows Position 1
   - ✅ Queue Length shows 1

### Test 9: Barber-Only Access (Security)
1. Login as customer account (not barber)
2. Try to access `/barber/dashboard` directly
3. **Expected Results:**
   - ✅ Middleware redirects to `/waitlist` (or shows 403)

4. Try to call API directly: `GET /api/waitlist/queue`
5. **Expected Results:**
   - ✅ Returns 403 Forbidden error

6. Try to call API directly: `POST /api/waitlist/serve-next`
7. **Expected Results:**
   - ✅ Returns 403 Forbidden error

### Test 10: Database Verification
1. Have customers on waitlist
2. As barber, serve next customer
3. Check Supabase Table Editor > `waitlist_entries`
4. **Expected Results:**
   - ✅ Served entry has `served_at` set to current timestamp (not NULL)
   - ✅ Active entries have `served_at IS NULL`
   - ✅ Active entries are ordered by `joined_at ASC`

### Test 11: Real-time Queue Updates
1. As barber, have dashboard open
2. In another browser/incognito, have customer join waitlist
3. As barber, refresh dashboard (or implement auto-refresh if added)
4. **Expected Results:**
   - ✅ New customer appears in queue
   - ✅ Queue count increases

---

## Database Verification (SQL Queries)

### Check Active Queue Order:
```sql
SELECT 
  we.id,
  we.customer_id,
  p.email,
  we.guest_count,
  we.joined_at,
  we.served_at
FROM waitlist_entries we
JOIN profiles p ON p.id = we.customer_id
WHERE we.served_at IS NULL
ORDER BY we.joined_at ASC;
```

### Check Served Entries:
```sql
SELECT 
  we.id,
  p.email,
  we.joined_at,
  we.served_at
FROM waitlist_entries we
JOIN profiles p ON p.id = we.customer_id
WHERE we.served_at IS NOT NULL
ORDER BY we.served_at DESC;
```

---

## Common Issues & Solutions

### Issue: "Forbidden - Barber access required"
- **Solution:** Verify user has `role = 'barber'` in `profiles` table

### Issue: Queue not updating after serve
- **Solution:** Check browser console, verify API call succeeds, check `served_at` in database

### Issue: Wrong order in queue
- **Solution:** Verify entries ordered by `joined_at ASC`, check timestamps in database

### Issue: Email shows "Unknown"
- **Solution:** Check that `profiles` table has email for customer_id, verify join logic

### Issue: "Serve Next" button not working
- **Solution:** Check browser console for errors, verify API endpoint works, check RLS policies

---

## Acceptance Criteria Checklist

- ✅ Barber sees all active entries in order (ordered by joined_at)
- ✅ "Serve Next" removes first entry (sets served_at = NOW())
- ✅ Remaining entries shift positions correctly (positions recalculated dynamically)
- ✅ Served entries no longer appear in queue
- ✅ Barber-only access enforced (API routes check role)
- ✅ Dashboard UI displays queue with customer email, guest_count, joined_at
- ✅ "Serve Next" button functional and disabled when queue empty

---

## Additional Notes

- Position is calculated dynamically (no stored position column)
- After serving, positions automatically recalculate based on `joined_at` ordering
- Customers' positions update immediately when they check their status
- RLS policies ensure barber can read/update all entries, customers can only see their own

---

**Milestone 3 Complete!** Ready for Milestone 4 when you are.

