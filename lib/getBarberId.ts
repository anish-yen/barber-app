export async function getBarberId(): Promise<string> {
  const barberId = process.env.NEXT_PUBLIC_BARBER_ID;

  if (!barberId) {
    throw new Error(
      'No barber found. Please set NEXT_PUBLIC_BARBER_ID.'
    );
  }

  return barberId;
}
