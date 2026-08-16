"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateAccount } from "./actions";

export function AccountForm({ email }: { email: string }) {
  const [state, formAction] = useActionState<{ error: string | null; success: boolean }, FormData>(
    updateAccount,
    { error: null, success: false }
  );

  return (
    <form action={formAction} className="card p-6 space-y-4 max-w-md">
      <h2 className="text-sm font-semibold text-text-primary">Compte</h2>
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Email</label>
        <input
          name="email"
          type="email"
          defaultValue={email}
          className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Mot de passe actuel</label>
        <input
          name="oldPassword"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Nouveau mot de passe</label>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>
      {state.error && <p className="text-sm text-danger bg-danger-dim rounded-[var(--radius-sm)] px-3 py-2">{state.error}</p>}
      {state.success && <p className="text-sm text-success bg-success-dim rounded-[var(--radius-sm)] px-3 py-2">Enregistré.</p>}
      <SubmitButton pendingLabel="Enregistrement...">Enregistrer</SubmitButton>
    </form>
  );
}
