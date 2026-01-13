import { createAdminClient } from '@/lib/supabase/admin';
import { sendWaitlistNotification } from '@/lib/resend';

export async function checkAndSendNotifications() {
  const supabase = createAdminClient();

  // Get all active entries ordered by joined_at
  const { data: allEntries, error: entriesError } = await supabase
    .from('waitlist_entries')
    .select('id, customer_id, joined_at, notification_sent')
    .is('served_at', null)
    .order('joined_at', { ascending: true });

  if (entriesError || !allEntries || allEntries.length < 3) return;

  const position3Entry = allEntries[2];
  if (!position3Entry || position3Entry.notification_sent) return;

  // Get email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', position3Entry.customer_id)
    .single();

  if (profileError || !profile?.email) return;

  // Send email (won't crash if RESEND_API_KEY missing due to our guard)
  const result = await sendWaitlistNotification(profile.email, 3);

  if (result.success) {
    await supabase
      .from('waitlist_entries')
      .update({ notification_sent: true })
      .eq('id', position3Entry.id);
  } else {
    console.warn('Notification not sent:', result.error);
  }
}
