import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/ui/submit-button";
import { AccountForm } from "./account-form";
import { updateWorkspaceName } from "./actions";

export default async function ParametresPage() {
  const profile = await requireProfile("coach");
  const supabase = await createClient();
  const { data: workspace } = await supabase.from("workspace").select("name").limit(1).single();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Paramètres</h1>

      <AccountForm email={profile.email} />

      <form action={updateWorkspaceName} className="card p-6 space-y-4 max-w-md">
        <h2 className="text-sm font-semibold text-text-primary">Espace</h2>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Nom de l&apos;espace affiché</label>
          <input
            name="name"
            defaultValue={workspace?.name ?? "Sentier"}
            className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <SubmitButton pendingLabel="Enregistrement...">Enregistrer</SubmitButton>
      </form>
    </div>
  );
}
