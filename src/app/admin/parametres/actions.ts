"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateAccount(_prevState: { error: string | null; success: boolean }, formData: FormData) {
  const profile = await requireProfile("coach");
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const oldPassword = String(formData.get("oldPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword) {
    if (!oldPassword) return { error: "Indique ton mot de passe actuel pour le changer.", success: false };
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: oldPassword,
    });
    if (reauthError) return { error: "Mot de passe actuel incorrect.", success: false };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message, success: false };
  }

  if (email && email !== profile.email) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return { error: error.message, success: false };
    await supabase.from("profiles").update({ email }).eq("id", profile.id);
  }

  revalidatePath("/admin/parametres");
  return { error: null, success: true };
}

export async function updateWorkspaceName(formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { data: workspace } = await supabase.from("workspace").select("id").limit(1).single();
  if (workspace) await supabase.from("workspace").update({ name }).eq("id", workspace.id);
  revalidatePath("/admin/parametres");
}
