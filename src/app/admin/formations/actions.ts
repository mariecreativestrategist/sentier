"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createFormation(formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const format = String(formData.get("format") ?? "Cohorte + coaching individuel");
  const description = String(formData.get("description") ?? "");
  if (!name) return;

  const { data, error } = await supabase
    .from("formations")
    .insert({ name, format, description, status: "draft" })
    .select("id")
    .single();

  if (error || !data) return;

  revalidatePath("/admin/formations");
  redirect(`/admin/formations/${data.id}`);
}

export async function updateFormationStatus(formationId: string, status: string) {
  await requireProfile("coach");
  const supabase = await createClient();
  await supabase.from("formations").update({ status }).eq("id", formationId);
  revalidatePath("/admin/formations");
  revalidatePath(`/admin/formations/${formationId}`);
}
