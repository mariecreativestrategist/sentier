export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "primary";

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-success-dim text-success",
  warning: "bg-accent-gold-dim text-accent-gold",
  danger: "bg-danger-dim text-danger",
  neutral: "bg-bg-elevated-2 text-text-muted",
  primary: "bg-primary-dim text-primary",
};

export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
