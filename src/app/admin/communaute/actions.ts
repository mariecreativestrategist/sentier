"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createChannel(formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const postPermission = String(formData.get("postPermission") ?? "all");
  const accessAll = formData.get("accessAll") === "on";
  const formationIds = formData.getAll("formationIds").map(String);
  if (!name) return;

  const { data: channel } = await supabase
    .from("channels")
    .insert({ name, post_permission: postPermission, access_all: accessAll })
    .select("id")
    .single();

  if (channel && !accessAll && formationIds.length > 0) {
    await supabase
      .from("channel_formations")
      .insert(formationIds.map((formationId) => ({ channel_id: channel.id, formation_id: formationId })));
  }

  revalidatePath("/admin/communaute");
}

export async function publishPost(channelId: string, formData: FormData) {
  const profile = await requireProfile("coach");
  const supabase = await createClient();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await supabase.from("posts").insert({ channel_id: channelId, author_id: profile.id, body });
  revalidatePath("/admin/communaute");
}
