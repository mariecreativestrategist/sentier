"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function submitDocForm(formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "autre");
  const formationId = String(formData.get("formationId") ?? "") || null;
  const learnerId = String(formData.get("learnerId") ?? "") || null;
  const file = formData.get("file") as File | null;
  if (!title) return;

  const { data: doc } = await supabase
    .from("documents")
    .insert({ title, type, formation_id: formationId, learner_id: learnerId })
    .select("id")
    .single();

  if (doc && file && file.size > 0) {
    const path = `documents/${doc.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("files").upload(path, file);
    if (!error) {
      await supabase.from("documents").update({ storage_path: path, filename: file.name }).eq("id", doc.id);
    }
  }
  revalidatePath("/admin/administratif");
  if (learnerId) revalidatePath(`/admin/apprenants/${learnerId}`);
}
