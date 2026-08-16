"use client";

import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { createLearner, type CreateLearnerState } from "./actions";

const initialState: CreateLearnerState = { error: null, tempPassword: null, email: null };

export function NewLearnerForm({ formations }: { formations: { id: string; name: string }[] }) {
  const [state, formAction] = useActionState<CreateLearnerState, FormData>(createLearner, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  if (state.tempPassword) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-success mb-1">Compte créé</p>
        <p className="text-sm text-text-muted mb-3">
          Transmets ces identifiants à ton apprenant — le mot de passe ne sera plus jamais affiché.
        </p>
        <div className="rounded-[var(--radius-sm)] bg-bg-elevated-2 border border-border-soft p-3 space-y-1 font-mono text-sm">
          <p>Email : {state.email}</p>
          <p>Mot de passe temporaire : {state.tempPassword}</p>
        </div>
        <button
          type="button"
          onClick={() => formRef.current?.requestSubmit()}
          className="text-sm text-primary font-medium mt-3"
        >
          + Ajouter un autre apprenant
        </button>
      </div>
    );
  }

  return (
    <details className="card p-5">
      <summary className="cursor-pointer text-sm font-medium text-primary list-none">+ Ajouter un apprenant</summary>
      <form ref={formRef} action={formAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
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
