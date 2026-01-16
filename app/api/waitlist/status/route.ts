import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBarberId } from '@/lib/getBarberId';
import { computeScheduleStatus } from '@/lib/schedule';
import type { HourRow, ClosureRow } from '@/lib/schedule';

export const runtime = 'nodejs';

const SHOP_TZ = process.env.SHOP_TIMEZONE ?? 'America/New_York';

function zonedDateStr(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const y = get('year');
  const m = get('month');
  const d = get('day');
  return `${y}-${m}-${d}`;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Step 1: Get the user's active entry first (by id, not customer_id)
    // This ensures we match the exact entry the user owns, avoiding duplicates
    const { data: userActiveEntry, error: userEntryError } = await supabase
      .from('waitlist_entries')
      .select('id, customer_id, guest_count, joined_at, priority_level')
      .eq('customer_id', user.id)
      .is('served_at', null)
      .maybeSingle();

    if (userEntryError) {
      return NextResponse.json({ error: userEntryError.message }, { status: 500 });
    }

    // Step 2: Get all active entries ordered by: priority_level DESC, joined_at ASC, id ASC
    // This ordering must be identical everywhere (status, queue, serve-next) for consistency
    const { data: entries, error: listError } = await admin
      .from('waitlist_entries')
      .select('id, customer_id, guest_count, joined_at, priority_level')
      .is('served_at', null)
      .order('priority_level', { ascending: false })
      .order('joined_at', { ascending: true })
      .order('id', { ascending: true });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const allEntries = entries || [];
    const totalEntries = allEntries.length;
    const totalPeople = allEntries.reduce((sum, e) => sum + e.guest_count, 0);

    // Step 3: Find the user's entry by entry.id (not customer_id) in the ordered list
    // This ensures accurate position calculation even if multiple entries existed (shouldn't happen due to join check)
    const userEntryIndex = userActiveEntry
      ? allEntries.findIndex((e) => e.id === userActiveEntry.id)
      : -1;
    const entry = userEntryIndex >= 0 ? allEntries[userEntryIndex] : null;
    // Position is 1-based (index + 1), or null if not in queue
    const position = userEntryIndex >= 0 ? userEntryIndex + 1 : null;

    const peopleAhead =
      userEntryIndex >= 0
        ? allEntries
            .slice(0, userEntryIndex)
            .reduce((sum, e) => sum + e.guest_count, 0)
        : 0;

    const estimatedWaitLowMinutes = peopleAhead * 30;
    const estimatedWaitHighMinutes = peopleAhead * 40;

    // Schedule status
    const barberId = await getBarberId();

    const { data: hours, error: hoursError } = await supabase
      .from('barber_hours')
      .select('day_of_week, start_time, end_time, is_open')
      .eq('barber_id', barberId);

    if (hoursError) {
      return NextResponse.json({ error: hoursError.message }, { status: 500 });
    }

    // Use shop-local "today" for closures filtering (avoid UTC day shift)
    const todayLocal = zonedDateStr(new Date(), SHOP_TZ);

    const { data: closures, error: closuresError } = await supabase
      .from('barber_closures')
      .select('date, is_closed, reason')
      .eq('barber_id', barberId)
      .eq('is_closed', true)
      .gte('date', todayLocal);

    if (closuresError) {
      return NextResponse.json({ error: closuresError.message }, { status: 500 });
    }

    const scheduleStatus = computeScheduleStatus(
      (hours || []) as HourRow[],
      (closures || []) as ClosureRow[],
      new Date(),
      SHOP_TZ
    );

    return NextResponse.json({
      entry,
      position,
      totalEntries,
      totalPeople,
      peopleAhead,
      estimatedWaitLowMinutes,
      estimatedWaitHighMinutes,
      isOpenNow: scheduleStatus.isOpenNow,
      todayHoursText: scheduleStatus.todayHoursText,
      nextOpenText: scheduleStatus.nextOpenText,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
