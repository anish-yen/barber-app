import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkAndSendNotifications } from '@/lib/waitlist-notifications';
import { getBarberId } from '@/lib/getBarberId';
import { computeScheduleStatus } from '@/lib/schedule';
import type { HourRow, ClosureRow } from '@/lib/schedule';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if shop is open
    const barberId = await getBarberId();

    // Get hours
    const { data: hours, error: hoursError } = await supabase
      .from('barber_hours')
      .select('day_of_week, start_time, end_time, is_open')
      .eq('barber_id', barberId);

    if (hoursError) {
      return NextResponse.json(
        { error: hoursError.message },
        { status: 500 }
      );
    }

    // Get closures for today
    const today = new Date().toISOString().split('T')[0];
    const { data: closures, error: closuresError } = await supabase
      .from('barber_closures')
      .select('date, is_closed, reason')
      .eq('barber_id', barberId)
      .eq('is_closed', true)
      .gte('date', today);

    if (closuresError) {
      return NextResponse.json(
        { error: closuresError.message },
        { status: 500 }
      );
    }

    // Compute schedule status
    const scheduleStatus = computeScheduleStatus(
      (hours || []) as HourRow[],
      (closures || []) as ClosureRow[]
    );

    if (!scheduleStatus.isOpenNow) {
      return NextResponse.json(
        {
          error: 'Shop is closed',
          todayHoursText: scheduleStatus.todayHoursText,
          nextOpenText: scheduleStatus.nextOpenText,
        },
        { status: 403 }
      );
    }

    // Get request body
    const { guest_count } = await request.json();
    const guestCount = guest_count === 2 ? 2 : 1; // Default to 1, only allow 1 or 2

    // Check if user already has an active entry
    const { data: existingEntry } = await supabase
      .from('waitlist_entries')
      .select('id, joined_at')
      .eq('customer_id', user.id)
      .is('served_at', null)
      .maybeSingle();

    if (existingEntry) {
      return NextResponse.json(
        { error: 'You are already on the waitlist', entry: existingEntry },
        { status: 400 }
      );
    }

    // Insert new entry
    const { data: newEntry, error: insertError } = await supabase
      .from('waitlist_entries')
      .insert({
        customer_id: user.id,
        guest_count: guestCount,
        notification_sent: false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // Check if new entry is at position 3 and send notification
    // Don't await - fire and forget to avoid blocking the response
    try {
        await checkAndSendNotifications();
      } catch (error) {
        console.error('Error checking notifications after join:', error);
      }

    return NextResponse.json({ entry: newEntry }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

