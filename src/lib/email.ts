import { Resend } from "resend";

// Emailing is entirely optional: every call site awaits this but never lets
// a failed/unconfigured send break the underlying action (account creation,
// message, correction...). Until a custom domain is verified on Resend,
// sending to anyone other than the Resend account owner is rejected by
// Resend itself — that's expected, not a bug here.
// Returns whether an email was actually attempted (RESEND_API_KEY configured) —
// callers use this to fall back to showing content on-screen when it isn't.
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Sentier <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("sendEmail failed", error);
    return false;
  }
}

export function emailLayout(title: string, bodyHtml: string) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #16213A;">
      <p style="font-size: 13px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: #3B5BDB; margin: 0 0 12px;">Sentier</p>
      <h1 style="font-size: 20px; margin: 0 0 16px;">${title}</h1>
      ${bodyHtml}
    </div>
  `;
}
