"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();

  const variantClasses =
    variant === "primary"
      ? "bg-primary text-white hover:opacity-90"
      : variant === "danger"
        ? "bg-danger text-white hover:opacity-90"
        : "border border-border text-text-primary hover:bg-bg-elevated-2";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-[var(--radius-sm)] px-3.5 py-2 text-sm font-medium transition disabled:opacity-60 ${variantClasses} ${className}`}
    >
      {pending ? (pendingLabel ?? "…") : children}
    </button>
  );
}
