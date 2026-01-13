import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkAndSendNotifications } from '@/lib/waitlist-notifications';

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

