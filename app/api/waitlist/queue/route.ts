import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
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

    // Get all active entries ordered by joined_at (FIFO)
    const { data: entries, error: entriesError } = await supabase
      .from('waitlist_entries')
      .select('id, customer_id, guest_count, joined_at')
      .is('served_at', null)
      .order('joined_at', { ascending: true });

    if (entriesError) {
      return NextResponse.json(
        { error: entriesError.message },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ entries: [] });
    }

    // Get customer emails
    const customerIds = entries.map((e) => e.customer_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', customerIds);

    if (profilesError) {
      return NextResponse.json(
        { error: profilesError.message },
        { status: 500 }
      );
    }

    // Create email map
    const emailMap = new Map(profiles?.map((p) => [p.id, p.email]) || []);

    // Format entries with email
    const formattedEntries = entries.map((entry) => ({
      id: entry.id,
      customer_id: entry.customer_id,
      email: emailMap.get(entry.customer_id) || 'Unknown',
      guest_count: entry.guest_count,
      joined_at: entry.joined_at,
    }));

    return NextResponse.json({ entries: formattedEntries });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

