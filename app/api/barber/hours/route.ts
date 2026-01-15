import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getBarberId } from '@/lib/getBarberId';

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

    const barberId = user.id;

    // Get hours
    const { data: hours, error: hoursError } = await supabase
      .from('barber_hours')
      .select('day_of_week, start_time, end_time, is_open')
      .eq('barber_id', barberId)
      .order('day_of_week', { ascending: true });

    if (hoursError) {
      return NextResponse.json(
        { error: hoursError.message },
        { status: 500 }
      );
    }

    // Get closures for next 30 days
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const maxDate = thirtyDaysLater.toISOString().split('T')[0];

    const { data: closures, error: closuresError } = await supabase
      .from('barber_closures')
      .select('date, is_closed, reason')
      .eq('barber_id', barberId)
      .eq('is_closed', true)
      .gte('date', today)
      .lte('date', maxDate)
      .order('date', { ascending: true });

    if (closuresError) {
      return NextResponse.json(
        { error: closuresError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hours: hours || [],
      closures: closures || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
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

    // Single-barber MVP: logged-in barber manages their schedule
    const barberId = user.id;

    const { day_of_week, start_time, end_time, is_open } = await request.json();

    if (typeof day_of_week !== 'number' || day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json(
        { error: 'day_of_week must be 0-6' },
        { status: 400 }
      );
    }

    if (is_open && (!start_time || !end_time)) {
      return NextResponse.json(
        { error: 'start_time and end_time are required when is_open is true' },
        { status: 400 }
      );
    }

    // Validate end_time > start_time if open
    if (is_open && start_time && end_time) {
      const [startHours, startMinutes] = start_time.split(':').map(Number);
      const [endHours, endMinutes] = end_time.split(':').map(Number);
      const startTotal = startHours * 60 + startMinutes;
      const endTotal = endHours * 60 + endMinutes;

      if (endTotal <= startTotal) {
        return NextResponse.json(
          { error: 'end_time must be after start_time' },
          { status: 400 }
        );
      }
    }

    // Upsert (delete then insert approach if no unique constraint)
    // First delete existing
    await supabase
      .from('barber_hours')
      .delete()
      .eq('barber_id', barberId)
      .eq('day_of_week', day_of_week);

    // Insert new
    const { data, error: insertError } = await supabase
      .from('barber_hours')
      .insert({
        barber_id: barberId,
        day_of_week,
        start_time: is_open ? start_time : null,
        end_time: is_open ? end_time : null,
        is_open,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ hour: data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

