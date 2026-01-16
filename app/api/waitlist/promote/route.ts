import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    // Check if user is barber
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'barber') {
      return NextResponse.json({ error: 'Forbidden - Barber access required' }, { status: 403 });
    }

    const { entry_id, priority_level } = await request.json();

    if (!entry_id) {
      return NextResponse.json(
        { error: 'entry_id is required' },
        { status: 400 }
      );
    }

    if (typeof priority_level !== 'number' || priority_level < 0) {
      return NextResponse.json(
        { error: 'priority_level must be a non-negative number' },
        { status: 400 }
      );
    }

    // Verify entry exists and is active
    const { data: entry, error: findError } = await supabase
      .from('waitlist_entries')
      .select('id, priority_level')
      .eq('id', entry_id)
      .is('served_at', null)
      .single();

    if (findError || !entry) {
      return NextResponse.json(
        { error: 'Entry not found or already served' },
        { status: 404 }
      );
    }

    // Update priority level
    const { data: updatedEntry, error: updateError } = await supabase
      .from('waitlist_entries')
      .update({ priority_level })
      .eq('id', entry_id)
      .select('id, customer_id, guest_count, joined_at, priority_level, served_at')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ entry: updatedEntry }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

