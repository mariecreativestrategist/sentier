"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function modulePath(formationId: string, moduleId: string) {
  return `/admin/formations/${formationId}/modules/${moduleId}`;
}

// --- Chapters -------------------------------------------------------------

export async function addChapter(formationId: string, moduleId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "Nouveau chapitre").trim() || "Nouveau chapitre";

  const { count } = await supabase.from("chapters").select("*", { count: "exact", head: true }).eq("module_id", moduleId);
  await supabase.from("chapters").insert({ module_id: moduleId, title, position: count ?? 0 });
  revalidatePath(modulePath(formationId, moduleId));
}

export async function updateChapter(formationId: string, moduleId: string, chapterId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  await supabase
    .from("chapters")
    .update({
      title: String(formData.get("title") ?? ""),
      video_url: String(formData.get("videoUrl") ?? ""),
      body_html: String(formData.get("body") ?? ""),
    })
    .eq("id", chapterId);
  revalidatePath(modulePath(formationId, moduleId));
}

export async function deleteChapter(formationId: string, moduleId: string, chapterId: string) {
  await requireProfile("coach");
  const supabase = await createClient();
  await supabase.from("chapters").delete().eq("id", chapterId);
  revalidatePath(modulePath(formationId, moduleId));
}

export async function addChapterFile(formationId: string, moduleId: string, chapterId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;

  const path = `chapters/${chapterId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("files").upload(path, file);
  if (!error) {
    await supabase
      .from("attachments")
      .insert({ owner_type: "chapter", owner_id: chapterId, filename: file.name, storage_path: path });
  }
  revalidatePath(modulePath(formationId, moduleId));
}

export async function removeAttachment(formationId: string, moduleId: string, attachmentId: string) {
  await requireProfile("coach");
  const supabase = await createClient();
  const { data: attachment } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .single();
  await supabase.from("attachments").delete().eq("id", attachmentId);
  if (attachment?.storage_path) {
    await supabase.storage.from("files").remove([attachment.storage_path]);
  }
  revalidatePath(modulePath(formationId, moduleId));
}

// --- Exercises --------------------------------------------------------------

export async function addExercise(formationId: string, moduleId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  if (!title) return;

  const { count } = await supabase.from("exercises").select("*", { count: "exact", head: true }).eq("module_id", moduleId);
  const { data: exercise } = await supabase
    .from("exercises")
    .insert({ module_id: moduleId, title, description_html: description, position: count ?? 0 })
    .select("id")
    .single();

  const file = formData.get("file") as File | null;
  if (exercise && file && file.size > 0) {
    const path = `exercises/${exercise.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("files").upload(path, file);
    if (!error) {
      await supabase
        .from("attachments")
        .insert({ owner_type: "exercise", owner_id: exercise.id, filename: file.name, storage_path: path });
    }
  }
  revalidatePath(modulePath(formationId, moduleId));
}

export async function saveCorrection(formationId: string, moduleId: string, submissionId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  await supabase
    .from("exercise_submissions")
    .update({
      status: "corrige",
      comment: String(formData.get("comment") ?? ""),
      note: String(formData.get("note") ?? ""),
      corrected_at: new Date().toISOString(),
    })
    .eq("id", submissionId);
  revalidatePath(modulePath(formationId, moduleId));
}

// --- Quiz -------------------------------------------------------------------

export async function addQuizQuestion(formationId: string, moduleId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const text = String(formData.get("text") ?? "").trim();
  const options = formData.getAll("option").map((o) => String(o).trim()).filter(Boolean);
  const correctIndex = Number(formData.get("correct") ?? -1);
  if (!text || options.length < 2 || correctIndex < 0 || correctIndex >= options.length) return;

  const { count } = await supabase.from("quiz_questions").select("*", { count: "exact", head: true }).eq("module_id", moduleId);
  const { data: question } = await supabase
    .from("quiz_questions")
    .insert({ module_id: moduleId, text, position: count ?? 0 })
    .select("id")
    .single();

  if (question) {
    await supabase.from("quiz_options").insert(
      options.map((text, i) => ({ question_id: question.id, text, is_correct: i === correctIndex, position: i }))
    );
  }
  revalidatePath(modulePath(formationId, moduleId));
}

export async function deleteQuizQuestion(formationId: string, moduleId: string, questionId: string) {
  await requireProfile("coach");
  const supabase = await createClient();
  await supabase.from("quiz_questions").delete().eq("id", questionId);
  revalidatePath(modulePath(formationId, moduleId));
}
