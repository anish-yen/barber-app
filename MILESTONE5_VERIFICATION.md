# Milestone 5 Verification Steps

## Manual Test Checklist

### Test 1: Barber Creates Announcement
1. Login as barber account
2. Navigate to `/barber/announcements`
3. Fill in form:
   - Title: "Running late today"
   - Message: "I'll be 15 minutes late. Thanks for your patience!"
4. Click "Create Announcement"
5. **Expected Results:**
   - ✅ Form clears after successful creation
   - ✅ Announcement appears in the list (newest first)
   - ✅ Announcement shows title, message, and timestamp
   - ✅ No error messages

### Test 2: Customer Sees Unread Count > 0
1. Login as customer account (or open in incognito)
2. Navigate to `/waitlist`
3. **Expected Results:**
   - ✅ Bell icon link shows "🔔 Announcements (1)" (or count matching number of announcements)
   - ✅ Badge shows unread count > 0
   - ✅ Link is clickable and leads to `/announcements`

### Test 3: Customer Opens /announcements and Count Becomes 0
1. While on `/waitlist` with unread count > 0
2. Click the "🔔 Announcements (X)" link
3. **Expected Results:**
   - ✅ Navigate to `/announcements`
   - ✅ Announcements list loads (newest first)
   - ✅ Unread announcements are visually highlighted (blue background/border)
   - ✅ "New" badge shows on unread announcements
   - ✅ All announcements marked as read automatically on page load
4. Go back to `/waitlist` (or refresh)
5. **Expected Results:**
   - ✅ Unread count shows 0 (or badge disappears if count is 0)
   - ✅ Bell link shows "🔔 Announcements" without count badge

### Test 4: Customer Cannot POST /api/announcements (403)
1. Login as customer account (not barber)
2. Open browser console (Network tab)
3. Try to create announcement via API:
   ```javascript
   fetch('/api/announcements', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ title: 'Test', message: 'Test message' })
   })
   ```
4. **Expected Results:**
   - ✅ Response status: 403 Forbidden
   - ✅ Error message: "Forbidden - Barber access required"
   - ✅ No announcement created in database

---

## Additional Test Scenarios

### Test 5: Multiple Announcements
1. As barber, create 3 announcements
2. **Expected Results:**
   - ✅ All announcements appear in list
   - ✅ Announcements ordered newest first (most recent at top)
   - ✅ Customer sees unread count = 3

### Test 6: Announcement List Ordering
1. As barber, create announcements in order: A, B, C (with delays)
2. **Expected Results:**
   - ✅ Customer sees: C, B, A (newest first)

### Test 7: Unread Highlighting
1. As customer, have 2 unread announcements
2. Navigate to `/announcements`
3. **Expected Results:**
   - ✅ First 2 announcements have blue background (unread)
   - ✅ "New" badge shows on unread announcements
   - ✅ After page load, all marked as read (refresh to see they're no longer highlighted)

### Test 8: No Announcements
1. Clear all announcements (or use fresh database)
2. As customer, navigate to `/announcements`
3. **Expected Results:**
   - ✅ Shows "No announcements yet" message
   - ✅ No errors

### Test 9: Barber Announcements Page
1. As barber, navigate to `/barber/announcements`
2. **Expected Results:**
   - ✅ Create form at top
   - ✅ List of all announcements below
   - ✅ No read/unread status shown (barber doesn't need this)
   - ✅ Announcements ordered newest first

### Test 10: Authentication Checks
1. Logout or clear cookies
2. Try to access `/announcements`
3. **Expected Results:**
   - ✅ Redirected to `/login`
4. Try to access `/barber/announcements` as customer
5. **Expected Results:**
   - ✅ Redirected to `/waitlist` (middleware protection)

---

## API Route Tests

### GET /api/announcements
```bash
# As customer
curl -X GET http://localhost:3000/api/announcements \
  -H "Cookie: your-auth-cookie"

# Expected: { announcements: [...] } with read: boolean for each
```

### GET /api/announcements/unread-count
```bash
# As customer
curl -X GET http://localhost:3000/api/announcements/unread-count \
  -H "Cookie: your-auth-cookie"

# Expected: { total: X, unread: Y }
```

### POST /api/announcements/mark-all-read
```bash
# As customer
curl -X POST http://localhost:3000/api/announcements/mark-all-read \
  -H "Cookie: your-auth-cookie"

# Expected: { success: true }
```

### POST /api/announcements (as customer - should fail)
```bash
# As customer
curl -X POST http://localhost:3000/api/announcements \
  -H "Cookie: your-auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Test"}'

# Expected: 403 { error: "Forbidden - Barber access required" }
```

---

## Database Verification

### Check Announcements:
```sql
SELECT id, title, message, barber_id, created_at
FROM announcements
ORDER BY created_at DESC;
```

### Check Read Status:
```sql
SELECT ar.customer_id, ar.announcement_id, ar.read_at, p.email
FROM announcement_reads ar
JOIN profiles p ON p.id = ar.customer_id
ORDER BY ar.read_at DESC;
```

---

## Acceptance Criteria Checklist

- ✅ Barber can create announcements (POST /api/announcements)
- ✅ Customer sees announcements list (GET /api/announcements)
- ✅ Unread count displayed on waitlist page (GET /api/announcements/unread-count)
- ✅ Announcements marked as read on page load (POST /api/announcements/mark-all-read)
- ✅ Unread announcements visually highlighted
- ✅ Announcements ordered newest first
- ✅ Customer cannot POST /api/announcements (403 error)
- ✅ All routes return JSON consistently
- ✅ Authentication/authorization enforced

---

**Milestone 5 Complete!**

