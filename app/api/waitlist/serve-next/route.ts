import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkAndSendNotifications } from '@/lib/waitlist-notifications';

export async function POST() {
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

    // Check if user is barber
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'barber') {
      return NextResponse.json({ error: 'Forbidden - Barber access required' }, { status: 403 });
    }

    // Find the next entry to serve using consistent ordering: priority_level DESC, joined_at ASC, id ASC
    // This ordering must be identical everywhere (status, queue, serve-next) for position accuracy
    const { data: nextEntry, error: findError } = await supabase
      .from('waitlist_entries')
      .select('id, customer_id, guest_count, joined_at, priority_level')
      .is('served_at', null)
      .order('priority_level', { ascending: false })
      .order('joined_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    if (!nextEntry) {
      return NextResponse.json(
        { error: 'No customers in queue' },
        { status: 404 }
      );
    }

    // Mark as served
    const { data: servedEntry, error: updateError } = await supabase
      .from('waitlist_entries')
      .update({ served_at: new Date().toISOString() })
      .eq('id', nextEntry.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Check if anyone is now at position 3 and send notification
    // Don't await - fire and forget to avoid blocking the response
    try {
      await checkAndSendNotifications();
    } catch (error) {
      console.error('Error checking notifications after serve:', error);
    }

    return NextResponse.json({ entry: servedEntry }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

