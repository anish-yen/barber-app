# Milestone 4 Verification Steps

## Files Created/Modified

### New Files
- `lib/resend.ts` - Resend email client and notification function
- `lib/waitlist-notifications.ts` - Server-side notification checking logic

### Modified Files
- `app/api/waitlist/serve-next/route.ts` - Added notification check after serving
- `app/api/waitlist/join/route.ts` - Added notification check after joining
- `env.example` - Added Resend environment variables
- `package.json` - Added resend dependency (requires `npm install`)

---

## Setup Required

### 1. Install Resend SDK
```bash
npm install resend
```

### 2. Set Up Resend Account
1. Create account at https://resend.com
2. Get API key from dashboard
3. (Optional) Set up sender domain or use default `onboarding@resend.dev`

### 3. Environment Variables
Update `.env.local`:
```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Daz Barber <noreply@yourdomain.com>
# OR use default:
# RESEND_FROM_EMAIL=Daz Barber <onboarding@resend.dev>
```

---

## Verification Steps

### Test 1: Join as 3rd Customer (Immediate Notification)
1. **Setup:** Clear waitlist or ensure it's empty
2. Have Customer 1 join waitlist
3. Have Customer 2 join waitlist
4. Have Customer 3 join waitlist (with email you can check)
5. **Expected Results:**
   - ✅ Customer 3 receives email immediately
   - ✅ Email subject: "You're almost up - only 2 ahead of you!"
   - ✅ Email mentions position 3
   - ✅ `notification_sent` flag set to `true` in database for Customer 3's entry

### Test 2: Serve Customer (Position 3 Notification Trigger)
1. **Setup:** Have 4 customers on waitlist (Customer A, B, C, D)
   - Customer C is at position 3
   - Customer C has NOT received notification yet (`notification_sent = false`)
2. As barber, serve Customer A (first customer)
3. **Expected Results:**
   - ✅ Customer B moves to position 1
   - ✅ Customer C moves to position 2
   - ✅ Customer D moves to position 3
   - ✅ Customer D receives email (if `notification_sent = false`)
   - ✅ `notification_sent` flag set to `true` for Customer D

### Test 3: Notification Only Sent Once
1. **Setup:** Have Customer X at position 3 with `notification_sent = true`
2. Serve a customer (Customer X remains at position 3)
3. **Expected Results:**
   - ✅ Customer X does NOT receive another email
   - ✅ `notification_sent` remains `true`

### Test 4: Serve Customer (Position 3 Becomes 2)
1. **Setup:** Have Customer Y at position 3 (already notified)
2. Serve a customer (Customer Y moves to position 2)
3. **Expected Results:**
   - ✅ No email sent (Customer Y already notified, and is now at position 2)
   - ✅ Only position 3 triggers notifications

### Test 5: Queue Less Than 3 Customers
1. **Setup:** Have only 1-2 customers on waitlist
2. Serve a customer or have someone join
3. **Expected Results:**
   - ✅ No email sent (position 3 doesn't exist)

### Test 6: Notification Flag Respect
1. **Setup:** 
   - Have Customer Z at position 3
   - Manually set `notification_sent = true` in database
2. Serve a customer (Customer Z remains at position 3)
3. **Expected Results:**
   - ✅ No email sent (flag already true)
   - ✅ Flag remains true

### Test 7: Email Content Verification
1. Receive notification email
2. **Expected Results:**
   - ✅ Subject: "You're almost up - only 2 ahead of you!"
   - ✅ Body mentions position 3
   - ✅ Body mentions "Only 2 people are ahead of you"
   - ✅ Body mentions "Daz Barber"
   - ✅ Email is HTML formatted

### Test 8: Server-Side Only (No Client Exposure)
1. Check browser network tab
2. Check client-side code
3. **Expected Results:**
   - ✅ No Resend API key in client code
   - ✅ No email sending logic in client code
   - ✅ All email logic is server-side (API routes)

### Test 9: Error Handling
1. Set invalid `RESEND_API_KEY` in `.env.local`
2. Try to trigger notification (join as 3rd customer)
3. **Expected Results:**
   - ✅ No error shown to user (graceful failure)
   - ✅ Error logged in server console
   - ✅ `notification_sent` flag NOT updated (since email failed)

### Test 10: Multiple Serves (Chain Notifications)
1. **Setup:** Have 5 customers on waitlist
   - Customer C at position 3 (not notified yet)
   - Customer D at position 4
   - Customer E at position 5
2. Serve Customer A
   - Customer C moves to position 2 (no notification)
   - Customer D moves to position 3 (should get notified)
3. **Expected Results:**
   - ✅ Customer D receives email
   - ✅ Customer D's `notification_sent = true`
4. Serve Customer B
   - Customer C moves to position 1
   - Customer D moves to position 2
   - Customer E moves to position 3 (should get notified)
5. **Expected Results:**
   - ✅ Customer E receives email
   - ✅ Customer E's `notification_sent = true`

---

## Database Verification

### Check Notification Flags:
```sql
SELECT 
  we.id,
  p.email,
  we.notification_sent,
  we.joined_at,
  we.served_at
FROM waitlist_entries we
JOIN profiles p ON p.id = we.customer_id
WHERE we.served_at IS NULL
ORDER BY we.joined_at ASC;
```

### Expected Results:
- Entries at position 3 should have `notification_sent = true`
- Entries not at position 3 should have `notification_sent = false` (unless they were at position 3 before)
- Served entries can have either value (not relevant)

---

## Common Issues & Solutions

### Issue: Email not sending
- **Solution:** 
  - Check `RESEND_API_KEY` is set correctly
  - Check Resend dashboard for API key status
  - Check server logs for errors
  - Verify email address in `profiles` table

### Issue: Email sending but flag not updating
- **Solution:** Check server logs for update errors, verify RLS policies allow updates

### Issue: Multiple emails sent
- **Solution:** Verify `notification_sent` flag is being checked and updated correctly

### Issue: Email sent when position is not 3
- **Solution:** Verify position calculation logic (should use index 2 for position 3)

### Issue: "Resend is not defined" error
- **Solution:** Run `npm install resend`

---

## Acceptance Criteria Checklist

- ✅ Email sent when position becomes 3
- ✅ Email sent only once per entry (`notification_sent` flag respected)
- ✅ Email contains queue position info (position 3 mentioned)
- ✅ `notification_sent` flag updated after successful send
- ✅ Server-side logic only (no client-side email code)
- ✅ Works after "Serve Next" (position recalculation)
- ✅ Works after "Join Waitlist" (if position 3 immediately)

---

## Additional Notes

- Notifications are sent asynchronously (fire-and-forget) to avoid blocking API responses
- Email failures are logged but don't break the user flow
- Position is calculated dynamically (no stored position column)
- Only position 3 triggers notifications (not position 2 or 1)

---

**Milestone 4 Complete!** Ready for Milestone 5 when you are.

