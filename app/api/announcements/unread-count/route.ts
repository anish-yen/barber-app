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

    // Get total count of announcements
    const { count: total, error: totalError } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      return NextResponse.json(
        { error: totalError.message },
        { status: 500 }
      );
    }

    // Get count of read announcements for current user
    const { count: readCount, error: readError } = await supabase
      .from('announcement_reads')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', user.id);

    if (readError) {
      return NextResponse.json(
        { error: readError.message },
        { status: 500 }
      );
    }

    const unread = (total || 0) - (readCount || 0);

    return NextResponse.json({
      total: total || 0,
      unread: Math.max(0, unread),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

