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

    // Get all announcement IDs
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('id');

    if (announcementsError) {
      return NextResponse.json(
        { error: announcementsError.message },
        { status: 500 }
      );
    }

    if (!announcements || announcements.length === 0) {
      return NextResponse.json({ success: true });
    }

    // Upsert read records for all announcements (ON CONFLICT will ignore duplicates)
    const reads = announcements.map((announcement) => ({
      customer_id: user.id,
      announcement_id: announcement.id,
    }));

    const { error: insertError } = await supabase
      .from('announcement_reads')
      .upsert(reads, {
        onConflict: 'customer_id,announcement_id',
        ignoreDuplicates: false,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
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

