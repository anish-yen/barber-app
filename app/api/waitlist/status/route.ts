import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth user (normal session client)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin client (bypasses RLS) - SERVER ONLY for global calculations
    const admin = createAdminClient();

    // Get all active entries ordered (stable ordering: joined_at ASC, id ASC)
    const { data: entries, error: listError } = await admin
      .from('waitlist_entries')
      .select('id, customer_id, guest_count, joined_at')
      .is('served_at', null)
      .order('joined_at', { ascending: true })
      .order('id', { ascending: true });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const allEntries = entries || [];
    const totalEntries = allEntries.length;

    // Calculate total people (sum of guest_count)
    const totalPeople = allEntries.reduce((sum, e) => sum + e.guest_count, 0);

    // Find user's entry and position
    const userEntryIndex = allEntries.findIndex((e) => e.customer_id === user.id);
    const entry = userEntryIndex >= 0 ? allEntries[userEntryIndex] : null;
    const position = userEntryIndex >= 0 ? userEntryIndex + 1 : null;

    // Calculate people ahead (sum of guest_count for entries before user)
    const peopleAhead = userEntryIndex >= 0
      ? allEntries.slice(0, userEntryIndex).reduce((sum, e) => sum + e.guest_count, 0)
      : 0;

    // Calculate wait estimates (30-40 minutes per person)
    const estimatedWaitLowMinutes = peopleAhead * 30;
    const estimatedWaitHighMinutes = peopleAhead * 40;

    return NextResponse.json({
      entry,
      position,
      totalEntries,
      totalPeople,
      peopleAhead,
      estimatedWaitLowMinutes,
      estimatedWaitHighMinutes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
