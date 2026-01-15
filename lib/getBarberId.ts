// lib/getBarberId.ts
export async function getBarberId(): Promise<string> {
  const envId = process.env.NEXT_PUBLIC_BARBER_ID;
  if (envId && envId.length > 0) return envId;

  // For single-barber MVP we require this to be set in Vercel / .env.local
  throw new Error(
    'No barber found. Please set NEXT_PUBLIC_BARBER_ID or create a barber account.'
  );
}
