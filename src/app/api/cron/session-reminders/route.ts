import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout } from "@/lib/email";
import { formatDateTime } from "@/lib/format";

// Triggered daily by Vercel Cron (see vercel.json). If CRON_SECRET is set in
// the project's env vars, Vercel automatically sends it as a Bearer token —
// verified here so the endpoint can't be triggered by anyone else. Setting
// CRON_SECRET is optional: the route still works without it, just without
// that extra check (nothing sensitive is exposed either way — worst case
// someone re-triggers a send, and reminder_sent still guards against spam).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: sessions } = await supabase
    .from("coaching_sessions")
    .select("id, title, scheduled_at, learner_id, profiles(email, full_name)")
    .eq("status", "a_venir")
    .eq("reminder_sent", false)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", in24h.toISOString());

  const coachEmail = process.env.COACH_NOTIFICATION_EMAIL;
  let sent = 0;
  for (const session of sessions ?? []) {
    const learner = session.profiles as unknown as { email: string; full_name: string } | null;
    if (!learner) continue;

    const ok = await sendEmail({
      to: learner.email,
      subject: `Rappel — session « ${session.title} »`,
      html: emailLayout(
        "Rappel de session",
        `<p>Ta session « ${session.title} » a lieu le ${formatDateTime(session.scheduled_at)}.</p>`
      ),
    });

    if (coachEmail) {
      await sendEmail({
        to: coachEmail,
        subject: `Rappel — session avec ${learner.full_name}`,
        html: emailLayout(
          "Rappel de session",
          `<p>Ta session « ${session.title} » avec <strong>${learner.full_name}</strong> a lieu le ${formatDateTime(session.scheduled_at)}.</p>`
        ),
      });
    }

    if (ok) {
      await supabase.from("coaching_sessions").update({ reminder_sent: true }).eq("id", session.id);
      sent += 1;
    }
  }

  return NextResponse.json({ checked: sessions?.length ?? 0, sent });
}
