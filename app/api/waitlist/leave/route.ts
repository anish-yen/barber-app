import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    // Find user's active entry
    const { data: activeEntry, error: findError } = await supabase
      .from('waitlist_entries')
      .select('id')
      .eq('customer_id', user.id)
      .is('served_at', null)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    if (!activeEntry) {
      return NextResponse.json(
        { error: 'You are not on the waitlist' },
        { status: 400 }
      );
    }

    // Mark as served (leaving queue)
    const { error: updateError } = await supabase
      .from('waitlist_entries')
      .update({ served_at: new Date().toISOString() })
      .eq('id', activeEntry.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

