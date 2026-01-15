# Schedule Feature Verification Steps

## Manual Tests (Must Pass)

### Test 1: Barber Sets Hours
1. Login as barber
2. Navigate to `/barber/schedule`
3. Set Monday: Open, 10:00 - 18:00
4. Set Tuesday: Closed (uncheck open)
5. Click "Save" for each day
6. **Expected:**
   - ✅ Changes save successfully
   - ✅ No errors

### Test 2: Customer Can Join During Open Hours
1. **Setup:** Set Monday as open (10:00 - 18:00)
2. **Simulate:** Change system time to Monday 12:00 PM (or test during actual open hours)
3. Login as customer
4. Navigate to `/waitlist`
5. Try to join waitlist
6. **Expected:**
   - ✅ Banner shows "Open now"
   - ✅ "Join Waitlist" button is enabled
   - ✅ Can join successfully
   - ✅ No 403 error

### Test 3: Customer Blocked During Closed Hours
1. **Setup:** Set Tuesday as closed
2. **Simulate:** Change system time to Tuesday (or test during closed day)
3. Login as customer
4. Navigate to `/waitlist`
5. Try to join waitlist
6. **Expected:**
   - ✅ Banner shows "Closed"
   - ✅ Shows "Closed today" and next open text
   - ✅ "Join Waitlist" button is disabled
   - ✅ API returns 403 with error: "Shop is closed"
   - ✅ Error message shows todayHoursText and nextOpenText

### Test 4: Add Closure
1. Login as barber
2. Navigate to `/barber/schedule`
3. In Closures section:
   - Select today's date (or a future date)
   - Optional: Enter reason "Holiday"
   - Click "Add Closure"
4. **Expected:**
   - ✅ Closure appears in closures list
   - ✅ Can see date and reason
5. As customer (during normally open hours):
   - Try to join waitlist
6. **Expected:**
   - ✅ Join blocked with 403
   - ✅ Shows closure message

### Test 5: Remove Closure
1. Login as barber
2. Navigate to `/barber/schedule`
3. Find closure in list
4. Click "Remove"
5. **Expected:**
   - ✅ Closure removed from list
6. As customer (during normally open hours):
   - Try to join waitlist
7. **Expected:**
   - ✅ Join allowed again (if within weekly hours)

### Test 6: Status Endpoint Returns Schedule Fields
1. Login as customer (NOT on waitlist)
2. Call API: `GET /api/waitlist/status`
3. **Expected:**
   - ✅ Response includes:
     - `isOpenNow` (boolean)
     - `todayHoursText` (string)
     - `nextOpenText` (string)
   - ✅ Fields present even when not on waitlist

### Test 7: Next Open Text
1. **Setup:** Set Wednesday as open (10:00 - 18:00), Monday-Tuesday closed
2. **Simulate:** Current time is Monday
3. Check `/waitlist` as customer
4. **Expected:**
   - ✅ Shows "Opens Wednesday at 10:00 AM" (or appropriate day/time)
   - ✅ Next open text is accurate

### Test 8: Validation
1. Login as barber
2. Try to set end_time <= start_time
3. **Expected:**
   - ✅ API returns 400 error: "end_time must be after start_time"

### Test 9: Customer Cannot Modify Schedule
1. Login as customer (not barber)
2. Try POST `/api/barber/hours`
3. **Expected:**
   - ✅ 403 Forbidden error

4. Try POST `/api/barber/closures`
5. **Expected:**
   - ✅ 403 Forbidden error

---

## Additional Test Scenarios

### Test 10: Multiple Closures
1. Add multiple closure dates
2. **Expected:**
   - ✅ All closures shown in list
   - ✅ Can remove each individually

### Test 11: Schedule UI Updates
1. Make changes to hours
2. Refresh page
3. **Expected:**
   - ✅ Changes persist
   - ✅ Form shows current values

### Test 12: Status Auto-Refresh with Schedule
1. Customer on `/waitlist` page
2. Barber adds closure for today
3. Wait for auto-refresh (20 seconds)
4. **Expected:**
   - ✅ Banner updates to "Closed"
   - ✅ Join button becomes disabled

---

## API Route Tests

### GET /api/barber/hours
```bash
# As customer or barber
curl -X GET http://localhost:3000/api/barber/hours \
  -H "Cookie: your-auth-cookie"

# Expected: { hours: [...], closures: [...] }
```

### POST /api/barber/hours
```bash
# As barber
curl -X POST http://localhost:3000/api/barber/hours \
  -H "Cookie: your-auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{"day_of_week": 1, "start_time": "10:00", "end_time": "18:00", "is_open": true}'

# Expected: { hour: {...} }
```

### POST /api/barber/closures
```bash
# As barber - Add closure
curl -X POST http://localhost:3000/api/barber/closures \
  -H "Cookie: your-auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-12-25", "is_closed": true, "reason": "Holiday"}'

# Expected: { closure: {...} }

# Remove closure
curl -X POST http://localhost:3000/api/barber/closures \
  -H "Cookie: your-auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-12-25", "is_closed": false}'

# Expected: { success: true }
```

### POST /api/waitlist/join (when closed)
```bash
# As customer, when shop is closed
curl -X POST http://localhost:3000/api/waitlist/join \
  -H "Cookie: your-auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{"guest_count": 1}'

# Expected: 403 {
#   "error": "Shop is closed",
#   "todayHoursText": "Closed today",
#   "nextOpenText": "Opens tomorrow at 10:00 AM"
# }
```

### GET /api/waitlist/status (with schedule)
```bash
# As customer
curl -X GET http://localhost:3000/api/waitlist/status \
  -H "Cookie: your-auth-cookie"

# Expected: {
#   entry: null,
#   position: null,
#   totalEntries: 0,
#   totalPeople: 0,
#   peopleAhead: 0,
#   estimatedWaitLowMinutes: 0,
#   estimatedWaitHighMinutes: 0,
#   isOpenNow: true,
#   todayHoursText: "Open today 10:00 AM – 6:00 PM",
#   nextOpenText: ""
# }
```

---

## Acceptance Criteria Checklist

- ✅ Barber can set weekly hours (all 7 days)
- ✅ Barber can add/remove closures
- ✅ Customer join blocked when closed (403 error)
- ✅ Customer join allowed when open
- ✅ Status endpoint returns schedule fields
- ✅ UI shows open/closed banner
- ✅ Join button disabled when closed
- ✅ Next open text displays correctly
- ✅ Validation prevents invalid time ranges
- ✅ Customer cannot modify schedule (403)
- ✅ All routes return JSON consistently

---

**Schedule Feature Complete!**

