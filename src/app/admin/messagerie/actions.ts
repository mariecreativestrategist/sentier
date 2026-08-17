"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, emailLayout } from "@/lib/email";

export async function sendCoachMessage(learnerId: string, formData: FormData) {
  const profile = await requireProfile("coach");
  const supabase = await createClient();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const { data: conversation } = await supabase
    .from("conversations")
    .upsert({ learner_id: learnerId }, { onConflict: "learner_id", ignoreDuplicates: true })
    .select("id")
    .single();

  const conversationId = conversation?.id ?? (await supabase.from("conversations").select("id").eq("learner_id", learnerId).single()).data?.id;
  if (!conversationId) return;

  await supabase.from("messages").insert({ conversation_id: conversationId, author_id: profile.id, body });

  const { data: learner } = await supabase.from("profiles").select("email, full_name").eq("id", learnerId).single();
  if (learner) {
    await sendEmail({
      to: learner.email,
      subject: `Nouveau message de ${profile.full_name}`,
      html: emailLayout("Nouveau message", `<p>${body}</p><p style="color:#5B6478;font-size:13px;">Réponds directement depuis ton espace Sentier, onglet Messagerie.</p>`),
    });
  }

  revalidatePath("/admin/messagerie");
}
