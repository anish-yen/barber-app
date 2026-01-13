import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

// IMPORTANT: Do NOT throw at import time.
// If apiKey is missing, resend stays null and we just skip sending.
const resend = apiKey ? new Resend(apiKey) : null;

export async function sendWaitlistNotification(to: string, position: number) {
  if (!resend) {
    // Don't crash the app if Resend isn't configured yet
    console.warn('RESEND_API_KEY missing - skipping email send');
    return { success: false, error: 'RESEND_API_KEY missing' as const };
  }

  try {
    // For dev/testing, Resend supports onboarding sender
    const from = 'onboarding@resend.dev';

    await resend.emails.send({
      from,
      to,
      subject: "You're almost up!",
      html: `<p>You're now position <b>${position}</b>. Only 2 people ahead of you.</p>`,
    });

    return { success: true as const };
  } catch (err: any) {
    return { success: false as const, error: err?.message ?? 'Email error' };
  }
}
