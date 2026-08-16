"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// The atomic guard is `is_booked = false` in both this WHERE clause and the
// "slots_book" RLS policy (see 0001_init.sql) — whichever request reaches
// Postgres first wins the row lock and flips is_booked, so the second
// concurrent request's UPDATE simply matches zero rows instead of double-booking.
export async function bookSlot(slotId: string, formData: FormData) {
  const profile = await requireProfile("learner");
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "Session réservée");

  const { data: slot } = await supabase
    .from("availability_slots")
    .select("start_at")
    .eq("id", slotId)
    .eq("is_booked", false)
    .single();
  if (!slot) return;

  const { data: session } = await supabase
    .from("coaching_sessions")
    .insert({ learner_id: profile.id, title, scheduled_at: slot.start_at, kind: "individual", status: "a_venir" })
    .select("id")
    .single();

  const { error } = await supabase
    .from("availability_slots")
    .update({ is_booked: true, booked_by: profile.id, session_id: session?.id })
    .eq("id", slotId)
    .eq("is_booked", false);

  if (error && session) {
    // Someone else booked it first — undo the session we just created.
    await supabase.from("coaching_sessions").delete().eq("id", session.id);
  }

  revalidatePath("/espace/coaching");
  revalidatePath("/espace");
}
