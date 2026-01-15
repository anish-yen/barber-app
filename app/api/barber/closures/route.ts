import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getBarberId } from '@/lib/getBarberId';

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

    // Single-barber MVP: logged-in barber manages their schedule
    const barberId = user.id;

    const { date, is_closed, reason } = await request.json();

    if (!date) {
      return NextResponse.json(
        { error: 'date is required' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    if (is_closed === false) {
      // Delete closure (remove closure so day follows weekly schedule)
      const { error: deleteError } = await supabase
        .from('barber_closures')
        .delete()
        .eq('barber_id', barberId)
        .eq('date', date);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Upsert closure (delete then insert if no unique constraint)
    await supabase
      .from('barber_closures')
      .delete()
      .eq('barber_id', barberId)
      .eq('date', date);

    const { data, error: insertError } = await supabase
      .from('barber_closures')
      .insert({
        barber_id: barberId,
        date,
        is_closed: true,
        reason: reason || null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ closure: data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

