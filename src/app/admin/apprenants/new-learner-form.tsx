"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { createLearner, type CreateLearnerState } from "./actions";

const initialState: CreateLearnerState = { error: null, email: null, inviteLink: null };

export function NewLearnerForm({ formations }: { formations: { id: string; name: string }[] }) {
  const [state, formAction] = useActionState<CreateLearnerState, FormData>(createLearner, initialState);
  const [dismissed, setDismissed] = useState(false);

  // Reset the "success panel dismissed" flag whenever a new action result
  // comes in, synchronously during render (React's documented pattern for
  // resetting state on prop/value change) rather than in a useEffect.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setDismissed(false);
  }

  if (state.email && !state.error && !dismissed) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-success mb-1">Compte créé</p>
        {state.inviteLink ? (
          <>
            <p className="text-sm text-text-muted mb-3">
              L&apos;email n&apos;est pas configuré (RESEND_API_KEY) — transmets ce lien à {state.email} toi-même, il ne sera plus affiché après.
            </p>
            <div className="rounded-[var(--radius-sm)] bg-bg-elevated-2 border border-border-soft p-3 font-mono text-xs break-all">
              {state.inviteLink}
            </div>
          </>
        ) : (
          <p className="text-sm text-text-muted mb-1">
            Une invitation a été envoyée par email à {state.email}.
          </p>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-sm text-primary font-medium mt-3"
        >
          + Ajouter un autre apprenant
        </button>
      </div>
    );
  }

  return (
    <details className="card p-5" open={dismissed || undefined}>
      <summary className="cursor-pointer text-sm font-medium text-primary list-none">+ Ajouter un apprenant</summary>
      <form action={formAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <input
          name="fullName"
          required
          placeholder="Nom complet"
          className="rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
        <select
          name="formationId"
          className="sm:col-span-2 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm"
        >
          <option value="">Inscrire à une formation (facultatif)</option>
          {formations.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        {state.error && (
          <p className="sm:col-span-2 text-sm text-danger bg-danger-dim rounded-[var(--radius-sm)] px-3 py-2">
            {state.error}
          </p>
        )}
        <SubmitButton className="sm:col-span-2" pendingLabel="Création...">
          Créer le compte
        </SubmitButton>
      </form>
    </details>
  );
}
