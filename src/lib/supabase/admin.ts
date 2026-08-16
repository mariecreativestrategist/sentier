import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS, can create auth users. Server-only:
// SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix so Next.js never
// bundles it into client code. Only import this from "use server" files.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
