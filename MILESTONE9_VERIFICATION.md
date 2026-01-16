# Milestone 9: "Baller Mode" (Priority Waitlist) — Verification Steps

## Overview
Baller Mode adds priority levels to the waitlist queue. Higher priority entries are served first. Priority is barber-controlled only (no customer self-assignment).

---

## Database Migration

### Test 1: Migration Applied
1. Run migration: `003_add_priority_level.sql`
2. Check Supabase table editor: `waitlist_entries`
3. **Expected:**
   - ✅ Column `priority_level` exists (INTEGER, NOT NULL, DEFAULT 0)
   - ✅ Constraint `check_priority_level_nonnegative` exists
   - ✅ Index `idx_waitlist_priority_joined` exists

---

## API Route Tests

### Test 2: POST /api/waitlist/join (No VIP Code)
1. Customer joins waitlist without any VIP code
2. **Expected:**
   - ✅ Entry created with `priority_level = 0`
   - ✅ No VIP code field in request/response
   - ✅ Join works normally

### Test 3: GET /api/waitlist/status (Priority Ordering)
1. Setup: Multiple entries with different priorities
   - Entry A: `priority_level = 1`, joined at 10:00
   - Entry B: `priority_level = 0`, joined at 10:05
   - Entry C: `priority_level = 1`, joined at 10:10
2. Call `GET /api/waitlist/status` as Entry A's customer
3. **Expected:**
   - ✅ Response includes `entry.priority_level = 1`
   - ✅ `position = 1` (A is first due to priority + earlier join)
   - ✅ Entries ordered by: `priority_level DESC, joined_at ASC`

### Test 4: GET /api/waitlist/queue (Priority Ordering)
1. Setup: Same entries as Test 3
2. Barber calls `GET /api/waitlist/queue`
3. **Expected:**
   - ✅ Entries ordered: A (priority 1, 10:00), C (priority 1, 10:10), B (priority 0, 10:05)
   - ✅ Each entry includes `priority_level` field
   - ✅ Response format unchanged except for `priority_level` field

### Test 5: POST /api/waitlist/serve-next (Priority First)
1. Setup: Same entries as Test 3
2. Barber calls `POST /api/waitlist/serve-next`
3. **Expected:**
   - ✅ Entry A served (highest priority, earliest join)
   - ✅ Queue reorders automatically
   - ✅ Next serve-next would serve Entry C (priority 1, 10:10)

### Test 6: POST /api/waitlist/promote (Barber-Only)
1. Customer joins waitlist (priority 0)
2. Barber calls `POST /api/waitlist/promote`:
   ```json
   {
     "entry_id": "<entry-id>",
     "priority_level": 1
   }
   ```
3. **Expected:**
   - ✅ Entry updated: `priority_level = 1`
   - ✅ Entry moves to top of queue (if no other priority entries)
   - ✅ Response includes updated entry

### Test 7: POST /api/waitlist/promote (Demote)
1. Entry has `priority_level = 1`
2. Barber calls `POST /api/waitlist/promote`:
   ```json
   {
     "entry_id": "<entry-id>",
     "priority_level": 0
   }
   ```
3. **Expected:**
   - ✅ Entry updated: `priority_level = 0`
   - ✅ Entry moves down in queue (by join time)
   - ✅ Response includes updated entry

### Test 8: POST /api/waitlist/promote (Unauthorized)
1. Customer (not barber) tries to call `POST /api/waitlist/promote`
2. **Expected:**
   - ✅ 403 Forbidden error

### Test 9: POST /api/waitlist/promote (Invalid Entry)
1. Barber calls `POST /api/waitlist/promote` with non-existent `entry_id`
2. **Expected:**
   - ✅ 404 error: "Entry not found or already served"

### Test 10: POST /api/waitlist/promote (Negative Priority)
1. Barber tries to set `priority_level = -1`
2. **Expected:**
   - ✅ 400 error: "priority_level must be a non-negative number"

---

## UI Tests

### Test 11: Barber Dashboard — Priority Column
1. Barber logs in → `/barber/dashboard`
2. Queue has entries with different priorities
3. **Expected:**
   - ✅ Table shows "Priority" column
   - ✅ Priority column displays: "VIP (1)" badge for `priority_level > 0`
   - ✅ Priority column displays: "Normal" for `priority_level = 0`

### Test 12: Barber Dashboard — Promote Button
1. Barber views queue
2. Entry with `priority_level = 0` visible
3. Click "Promote" button
4. **Expected:**
   - ✅ Entry moves to top of queue (if no other priority entries)
   - ✅ Priority column updates to "VIP (1)" badge
   - ✅ Button changes to "Demote"

### Test 13: Barber Dashboard — Demote Button
1. Barber views queue
2. Entry with `priority_level > 0` visible
3. Click "Demote" button
4. **Expected:**
   - ✅ Entry moves down in queue (by join time)
   - ✅ Priority column updates to "Normal"
   - ✅ Button changes to "Promote"

### Test 14: Customer Waitlist Page — No VIP Code Input
1. Customer logs in → `/waitlist`
2. Not on waitlist (join form visible)
3. **Expected:**
   - ✅ No VIP code input field visible
   - ✅ Join form only shows: guest count selector + "Join Waitlist" button
   - ✅ Join works normally

### Test 15: Customer Waitlist Page — Priority Display (Optional)
1. Customer joins waitlist
2. Barber promotes customer's entry
3. Customer views `/waitlist` status
4. **Expected:**
   - ✅ Status shows correctly (priority ordering reflected in position)
   - ✅ Optional: Display "VIP" badge if `entry.priority_level > 0`

---

## Integration Tests

### Test 16: Queue Ordering Consistency
1. Setup:
   - Entry A: `priority_level = 0`, joined 10:00
   - Entry B: `priority_level = 1`, joined 10:30
   - Entry C: `priority_level = 0`, joined 10:15
2. Check `/api/waitlist/queue` (barber view)
3. Check `/api/waitlist/status` as each customer
4. **Expected:**
   - ✅ Queue order: B (priority 1), A (normal, 10:00), C (normal, 10:15)
   - ✅ Position for B: `1`
   - ✅ Position for A: `2`
   - ✅ Position for C: `3`

### Test 17: Email Notification (Position 3 with Priority)
1. Setup:
   - 5 entries total
   - Entry at position 3 (by priority ordering) has `priority_level = 1`
2. Barber serves entry at position 1
3. **Expected:**
   - ✅ Entry at new position 3 receives email notification
   - ✅ Notification respects priority ordering (not just join time)

### Test 18: Multiple Priority Levels
1. Barber promotes entries to different levels:
   - Entry A: `priority_level = 2`
   - Entry B: `priority_level = 1`
   - Entry C: `priority_level = 0`
2. Check queue order
3. **Expected:**
   - ✅ Order: A (level 2), B (level 1), C (level 0)

### Test 19: Priority Tie-Breaking (Same Priority)
1. Setup:
   - Entry A: `priority_level = 1`, joined 10:00
   - Entry B: `priority_level = 1`, joined 10:30
2. Check queue order
3. **Expected:**
   - ✅ Order: A (earlier join), B (later join)

---

## Acceptance Criteria Checklist

- ✅ Migration adds `priority_level` column with default 0
- ✅ Migration adds constraint and index
- ✅ Join always sets `priority_level = 0` (no VIP code)
- ✅ All queue queries order by: `priority_level DESC, joined_at ASC, id ASC`
- ✅ Status endpoint returns `priority_level` in entry
- ✅ Queue endpoint returns `priority_level` in entries
- ✅ Serve-next serves highest priority first
- ✅ Promote endpoint allows barber to set `priority_level`
- ✅ Barber dashboard shows priority column
- ✅ Barber dashboard has promote/demote buttons
- ✅ Customer waitlist page has no VIP code input
- ✅ Email notifications respect priority ordering
- ✅ All manual tests pass

---

**Milestone 9 Complete: Baller Mode (Priority Waitlist) — Barber-Controlled Only!**

