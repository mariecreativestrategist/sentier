"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function publishClientPost(channelId: string, formData: FormData) {
  const profile = await requireProfile("learner");
  const supabase = await createClient();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  // RLS's posts_insert policy also enforces post_permission = 'all' server-side —
  // this isn't just a UI-level check.
  await supabase.from("posts").insert({ channel_id: channelId, author_id: profile.id, body });
  revalidatePath("/espace/communaute");
}
