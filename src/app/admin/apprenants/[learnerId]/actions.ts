"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function path(learnerId: string) {
  return `/admin/apprenants/${learnerId}`;
}

export async function addNote(learnerId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await supabase.from("coach_notes").insert({ learner_id: learnerId, body });
  revalidatePath(path(learnerId));
}

export async function saveSessionDetail(learnerId: string, sessionId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  await supabase
    .from("coaching_sessions")
    .update({
      recording_url: String(formData.get("recordingUrl") ?? ""),
      transcript: String(formData.get("transcript") ?? ""),
    })
    .eq("id", sessionId);
  revalidatePath(path(learnerId));
}

export async function submitApprenantDocForm(learnerId: string, formationId: string | null, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "autre");
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
  revalidatePath(`/admin/apprenants/${learnerId}`);
  revalidatePath("/admin/administratif");
}
