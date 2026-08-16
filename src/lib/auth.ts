import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: "coach" | "learner";
  avatar_color: string;
};

// Defense in depth: proxy.ts already gates /admin and /espace by role, but
// each Server Function/Component re-checks — see proxy.js docs' own warning
// that a matcher change can silently remove proxy coverage.
export async function requireProfile(role?: "coach" | "learner"): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_color")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (role && profile.role !== role) {
    redirect(profile.role === "coach" ? "/admin" : "/espace");
  }

  return profile as Profile;
}
