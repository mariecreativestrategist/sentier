"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addModule(formationId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { count } = await supabase
    .from("modules")
    .select("*", { count: "exact", head: true })
    .eq("formation_id", formationId);

  await supabase.from("modules").insert({ formation_id: formationId, name, position: count ?? 0 });
  revalidatePath(`/admin/formations/${formationId}`);
}

export async function enrollLearner(formationId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const learnerId = String(formData.get("learnerId") ?? "");
  if (!learnerId) return;

  await supabase.from("enrollments").upsert(
    { learner_id: learnerId, formation_id: formationId, progress: 0, status: "ontrack" },
    { onConflict: "learner_id,formation_id", ignoreDuplicates: true }
  );
  revalidatePath(`/admin/formations/${formationId}`);
}

export async function updateFormationDescription(formationId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const description = String(formData.get("description") ?? "");
  await supabase.from("formations").update({ description }).eq("id", formationId);
  revalidatePath(`/admin/formations/${formationId}`);
}
