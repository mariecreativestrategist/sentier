"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addGroupLive(formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  const formationId = String(formData.get("formationId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const duration = Number(formData.get("duration") ?? 60);
  const link = String(formData.get("link") ?? "");
  if (!title || !formationId || !date || !time) return;

  await supabase.from("group_sessions").insert({
    formation_id: formationId,
    title,
    starts_at: new Date(`${date}T${time}`).toISOString(),
    duration_minutes: duration,
    meeting_link: link || null,
  });
  revalidatePath("/admin/coaching");
}

export async function removeGroupLive(id: string) {
  await requireProfile("coach");
  const supabase = await createClient();
  await supabase.from("group_sessions").delete().eq("id", id);
  revalidatePath("/admin/coaching");
}

export async function addSlot(formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const duration = Number(formData.get("duration") ?? 60);
  if (!date || !time) return;

  const start = new Date(`${date}T${time}`);
  const end = new Date(start.getTime() + duration * 60000);
  await supabase.from("availability_slots").insert({ start_at: start.toISOString(), end_at: end.toISOString() });
  revalidatePath("/admin/coaching");
}

export async function removeSlot(id: string) {
  await requireProfile("coach");
  const supabase = await createClient();
  await supabase.from("availability_slots").delete().eq("id", id).eq("is_booked", false);
  revalidatePath("/admin/coaching");
}

export async function confirmDirectBooking(formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const learnerId = String(formData.get("learnerId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  if (!learnerId || !title || !date || !time) return;

  await supabase.from("coaching_sessions").insert({
    learner_id: learnerId,
    title,
    scheduled_at: new Date(`${date}T${time}`).toISOString(),
    kind: "individual",
    status: "a_venir",
  });
  revalidatePath("/admin/coaching");
  revalidatePath("/admin");
}
