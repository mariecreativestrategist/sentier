"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markModuleDone(moduleId: string) {
  const profile = await requireProfile("learner");
  const supabase = await createClient();

  const { data: mod } = await supabase.from("modules").select("formation_id").eq("id", moduleId).single();
  if (!mod) return;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("learner_id", profile.id)
    .eq("formation_id", mod.formation_id)
    .single();
  if (!enrollment) return;

  await supabase
    .from("module_progress")
    .upsert({ enrollment_id: enrollment.id, module_id: moduleId, state: "done" }, { onConflict: "enrollment_id,module_id" });

  const { count: totalModules } = await supabase
    .from("modules")
    .select("*", { count: "exact", head: true })
    .eq("formation_id", mod.formation_id);
  const { count: doneModules } = await supabase
    .from("module_progress")
    .select("*", { count: "exact", head: true })
    .eq("enrollment_id", enrollment.id)
    .eq("state", "done");

  const progress = totalModules ? Math.round(((doneModules ?? 0) / totalModules) * 100) : 0;
  await supabase.from("enrollments").update({ progress }).eq("id", enrollment.id);

  revalidatePath("/espace");
  revalidatePath("/espace/formation");
  revalidatePath(`/espace/formation/${moduleId}`);
}

export async function submitExercise(exerciseId: string, moduleId: string, formData: FormData) {
  const profile = await requireProfile("learner");
  const supabase = await createClient();
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  await supabase.from("exercise_submissions").insert({
    exercise_id: exerciseId,
    learner_id: profile.id,
    content,
    status: "a_corriger",
  });

  revalidatePath(`/espace/formation/${moduleId}`);
}

export async function submitQuiz(moduleId: string, formData: FormData) {
  const profile = await requireProfile("learner");
  const supabase = await createClient();

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, quiz_options(id, is_correct)")
    .eq("module_id", moduleId);

  if (!questions || questions.length === 0) return;

  let score = 0;
  for (const q of questions) {
    const picked = String(formData.get(`answer_${q.id}`) ?? "");
    const correctOption = q.quiz_options.find((o) => o.is_correct);
    if (correctOption && picked === correctOption.id) score += 1;
  }

  await supabase.from("quiz_attempts").upsert(
    { module_id: moduleId, learner_id: profile.id, score, total: questions.length, attempt_number: 1 },
    { onConflict: "module_id,learner_id" }
  );

  revalidatePath(`/espace/formation/${moduleId}`);
}
