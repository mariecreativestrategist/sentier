"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout } from "@/lib/email";

const AVATAR_COLORS = ["sage", "gold", "rose", "neutral"];

export type CreateLearnerState = {
  error: string | null;
  email: string | null;
  // Set only when RESEND_API_KEY isn't configured — the coach copies this
  // link and sends it themselves instead of it going out by email.
  inviteLink: string | null;
};

export async function createLearner(
  _prevState: CreateLearnerState,
  formData: FormData
): Promise<CreateLearnerState> {
  const coach = await requireProfile("coach");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const formationId = String(formData.get("formationId") ?? "") || null;

  if (!fullName || !email) {
    return { error: "Le nom et l'email sont obligatoires.", email: null, inviteLink: null };
  }

  const admin = createAdminClient();
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { full_name: fullName, role: "learner", avatar_color: avatarColor } },
  });

  if (error || !data.user) {
    const message = error?.message.includes("already been registered")
      ? "Un compte existe déjà avec cet email."
      : "Impossible de créer le compte. Vérifie que SUPABASE_SERVICE_ROLE_KEY est bien configurée.";
    return { error: message, email: null, inviteLink: null };
  }

  if (formationId) {
    const supabase = await createClient();
    await supabase
      .from("enrollments")
      .insert({ learner_id: data.user.id, formation_id: formationId, progress: 0, status: "ontrack" });
    revalidatePath(`/admin/formations/${formationId}`);
  }

  const actionLink = data.properties?.action_link;
  let emailed = false;
  if (actionLink) {
    emailed = await sendEmail({
      to: email,
      subject: `${coach.full_name} t'invite sur Sentier`,
      html: emailLayout(
        "Bienvenue sur Sentier",
        `<p>${coach.full_name} t'a créé un accès à son espace de formation.</p>
         <p><a href="${actionLink}" style="display:inline-block;background:#3B5BDB;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Créer mon mot de passe</a></p>`
      ),
    });
  }

  revalidatePath("/admin/apprenants");
  return { error: null, email, inviteLink: emailed ? null : (actionLink ?? null) };
}
