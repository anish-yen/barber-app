import { createClient } from '@/lib/supabase/server';

/**
 * Get the barber ID for the single-barber MVP
 * Server-only function
 */
export async function getBarberId(): Promise<string> {
  // Check environment variable first
  if (process.env.NEXT_PUBLIC_BARBER_ID) {
    return process.env.NEXT_PUBLIC_BARBER_ID;
  }

  // Fallback: query first barber profile
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'barber')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error || !profile) {
    throw new Error('No barber found. Please set NEXT_PUBLIC_BARBER_ID or create a barber account.');
  }

  return profile.id;
}

