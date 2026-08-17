"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, emailLayout } from "@/lib/email";

export async function sendLearnerMessage(formData: FormData) {
  const profile = await requireProfile("learner");
  const supabase = await createClient();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const { data: conversation } = await supabase
    .from("conversations")
    .upsert({ learner_id: profile.id }, { onConflict: "learner_id", ignoreDuplicates: true })
    .select("id")
    .single();

  const conversationId =
    conversation?.id ?? (await supabase.from("conversations").select("id").eq("learner_id", profile.id).single()).data?.id;
  if (!conversationId) return;

  await supabase.from("messages").insert({ conversation_id: conversationId, author_id: profile.id, body });

  const coachEmail = process.env.COACH_NOTIFICATION_EMAIL;
  if (coachEmail) {
    await sendEmail({
      to: coachEmail,
      subject: `Nouveau message de ${profile.full_name}`,
      html: emailLayout("Nouveau message", `<p><strong>${profile.full_name}</strong> :</p><p>${body}</p>`),
    });
  }

  revalidatePath("/espace/messagerie");
}
