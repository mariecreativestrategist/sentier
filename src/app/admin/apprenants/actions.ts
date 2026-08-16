"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const AVATAR_COLORS = ["sage", "gold", "rose", "neutral"];

function generateTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export type CreateLearnerState = {
  error: string | null;
  tempPassword: string | null;
  email: string | null;
};

export async function createLearner(
  _prevState: CreateLearnerState,
  formData: FormData
): Promise<CreateLearnerState> {
  await requireProfile("coach");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const formationId = String(formData.get("formationId") ?? "") || null;

  if (!fullName || !email) {
    return { error: "Le nom et l'email sont obligatoires.", tempPassword: null, email: null };
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "learner", avatar_color: avatarColor },
  });

  if (error || !data.user) {
    const message = error?.message.includes("already been registered")
      ? "Un compte existe déjà avec cet email."
      : "Impossible de créer le compte. Vérifie que SUPABASE_SERVICE_ROLE_KEY est bien configurée.";
    return { error: message, tempPassword: null, email: null };
  }

  if (formationId) {
    const supabase = await createClient();
    await supabase
      .from("enrollments")
      .insert({ learner_id: data.user.id, formation_id: formationId, progress: 0, status: "ontrack" });
    revalidatePath(`/admin/formations/${formationId}`);
  }

  revalidatePath("/admin/apprenants");
  return { error: null, tempPassword, email };
}
