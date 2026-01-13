# Milestone 6 Verification Steps

## Manual Test Checklist

### Test 1: Leave Waitlist
1. Login as customer
2. Join waitlist (if not already on it)
3. Navigate to `/waitlist`
4. Click "Leave Waitlist" button
5. **Expected Results:**
   - ✅ Button responds (no error)
   - ✅ Status updates immediately (shows join form)
   - ✅ User is no longer on waitlist
   - ✅ Database shows `served_at` set for the entry

### Test 2: Leave Waitlist When Not on Queue
1. Login as customer
2. Ensure not on waitlist (or leave if already on it)
3. Try to call API directly: `POST /api/waitlist/leave`
4. **Expected Results:**
   - ✅ Response 400 Bad Request
   - ✅ Error message: "You are not on the waitlist"

### Test 3: Wait Time Estimates Display
1. **Setup:** Have at least 3 customers on waitlist with different guest counts
   - Customer A: 1 guest (position 1)
   - Customer B: 2 guests (position 2)
   - Customer C: 1 guest (position 3) - this is the test user
2. Login as Customer C
3. Navigate to `/waitlist`
4. **Expected Results:**
   - ✅ Shows "Your Position: 3"
   - ✅ Shows "People Ahead: 3" (1 + 2 = 3 people)
   - ✅ Shows "Total in Queue: X people (Y parties)"
   - ✅ Shows "Estimated Wait: 90–120 min" (3 people * 30-40 min)
   - ✅ Wait estimate only shows if peopleAhead > 0

### Test 4: Wait Estimates with Multiple People Ahead
1. **Setup:** Create queue with:
   - Position 1: 2 guests
   - Position 2: 1 guest
   - Position 3: 1 guest (test user)
   - Position 4: 2 guests
2. Login as position 3 user
3. Check `/waitlist`
4. **Expected Results:**
   - ✅ People Ahead: 3 (2 + 1 = 3)
   - ✅ Estimated Wait: 90–120 min (3 * 30-40)
   - ✅ Total People: 6 (2+1+1+2)
   - ✅ Total Entries: 4

### Test 5: First in Queue (No Wait Estimate)
1. **Setup:** Be first in queue (position 1)
2. Navigate to `/waitlist`
3. **Expected Results:**
   - ✅ Shows "Your Position: 1"
   - ✅ Shows "People Ahead: 0"
   - ✅ Estimated Wait section NOT shown (peopleAhead = 0)
   - ✅ Shows "Leave Waitlist" button

### Test 6: Auto Refresh
1. Login as customer, join waitlist
2. Navigate to `/waitlist`
3. In another browser/incognito, have barber serve customers
4. Wait 20+ seconds on customer's `/waitlist` page
5. **Expected Results:**
   - ✅ Status auto-refreshes (position updates, peopleAhead updates)
   - ✅ Wait estimate updates accordingly
   - ✅ No page reload required

### Test 7: Status Response Structure
1. Login as customer on waitlist
2. Check browser Network tab → `/api/waitlist/status` response
3. **Expected Results:**
   - ✅ Response includes:
     - `entry` (user's entry or null)
     - `position` (number or null)
     - `totalEntries` (number)
     - `totalPeople` (number)
     - `peopleAhead` (number)
     - `estimatedWaitLowMinutes` (number)
     - `estimatedWaitHighMinutes` (number)

### Test 8: Ordering Stability
1. **Setup:** Have multiple customers join waitlist at similar times
2. Check positions remain consistent
3. **Expected Results:**
   - ✅ Ordering is stable (joined_at ASC, id ASC)
   - ✅ Positions don't change randomly on refresh

### Test 9: Leave Waitlist and Rejoin
1. Join waitlist
2. Leave waitlist
3. Join waitlist again
4. **Expected Results:**
   - ✅ Can rejoin successfully
   - ✅ Gets new position (end of queue)
   - ✅ Status shows correctly

### Test 10: Multiple Guests Calculation
1. **Setup:** Queue with:
   - Position 1: 1 guest
   - Position 2: 2 guests (test user)
   - Position 3: 1 guest
2. Login as position 2 user (2 guests)
3. Check status
4. **Expected Results:**
   - ✅ People Ahead: 1 (only position 1)
   - ✅ Estimated Wait: 30–40 min (1 person * 30-40)
   - ✅ Total People: 4 (1+2+1)
   - ✅ Shows "Guests: 2"

---

## API Route Tests

### POST /api/waitlist/leave
```bash
# As customer on waitlist
curl -X POST http://localhost:3000/api/waitlist/leave \
  -H "Cookie: your-auth-cookie"

# Expected: { success: true }

# As customer NOT on waitlist
# Expected: 400 { error: "You are not on the waitlist" }
```

### GET /api/waitlist/status (Enhanced)
```bash
# As customer on waitlist
curl -X GET http://localhost:3000/api/waitlist/status \
  -H "Cookie: your-auth-cookie"

# Expected: {
#   entry: {...},
#   position: 2,
#   totalEntries: 5,
#   totalPeople: 8,
#   peopleAhead: 3,
#   estimatedWaitLowMinutes: 90,
#   estimatedWaitHighMinutes: 120
# }
```

---

## Database Verification

### Check Leave Functionality:
```sql
-- Before leave
SELECT id, customer_id, served_at
FROM waitlist_entries
WHERE customer_id = '<user_id>' AND served_at IS NULL;

-- After leave
SELECT id, customer_id, served_at
FROM waitlist_entries
WHERE customer_id = '<user_id>' AND served_at IS NOT NULL
ORDER BY served_at DESC LIMIT 1;
```

---

## Acceptance Criteria Checklist

- ✅ POST /api/waitlist/leave removes user from queue
- ✅ GET /api/waitlist/status returns enhanced data (totalEntries, totalPeople, peopleAhead, wait estimates)
- ✅ Wait estimates calculated correctly (30-40 min per person ahead)
- ✅ UI shows position, peopleAhead, totalPeople, estimated wait range
- ✅ "Leave Waitlist" button functional
- ✅ Auto refresh every 20 seconds works
- ✅ Ordering is stable (joined_at ASC, id ASC)
- ✅ Guest counts properly accounted for in calculations

---

**Milestone 6 Complete!**

