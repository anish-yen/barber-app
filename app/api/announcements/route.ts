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

    // Get all announcements ordered by newest first
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('id, title, message, created_at, barber_id')
      .order('created_at', { ascending: false });

    if (announcementsError) {
      return NextResponse.json(
        { error: announcementsError.message },
        { status: 500 }
      );
    }

    if (!announcements || announcements.length === 0) {
      return NextResponse.json({ announcements: [] });
    }

    // Get read status for current user
    const announcementIds = announcements.map((a) => a.id);
    const { data: reads, error: readsError } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('customer_id', user.id)
      .in('announcement_id', announcementIds);

    if (readsError) {
      return NextResponse.json(
        { error: readsError.message },
        { status: 500 }
      );
    }

    // Create set of read announcement IDs
    const readIds = new Set(reads?.map((r) => r.announcement_id) || []);

    // Add read status to each announcement
    const announcementsWithRead = announcements.map((announcement) => ({
      ...announcement,
      read: readIds.has(announcement.id),
    }));

    return NextResponse.json({ announcements: announcementsWithRead });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

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

    // Get request body
    const { title, message } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Create announcement
    const { data: announcement, error: insertError } = await supabase
      .from('announcements')
      .insert({
        barber_id: user.id,
        title,
        message,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

