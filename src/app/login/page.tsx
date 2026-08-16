"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<{ error: string | null }, FormData>(signIn, {
    error: null,
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-semibold mb-3">
            S
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Sentier</h1>
          <p className="text-sm text-text-muted mt-1">
            Connecte-toi à ton espace formation
          </p>
        </div>

        <form action={formAction} className="card p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
            />
          </div>

          {state.error && (
            <p className="text-sm text-danger bg-danger-dim rounded-[var(--radius-sm)] px-3 py-2">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-[var(--radius-sm)] bg-primary text-white text-sm font-medium py-2.5 hover:opacity-90 disabled:opacity-60 transition"
          >
            {pending ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-xs text-text-faint text-center mt-6">
          Comptes créés par le formateur — pas d&apos;inscription libre.
        </p>
      </div>
    </div>
  );
}
