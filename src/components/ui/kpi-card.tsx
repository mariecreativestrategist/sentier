import Link from "next/link";
import type { ReactNode } from "react";

const iconColorClasses: Record<string, string> = {
  gold: "bg-accent-gold-dim text-accent-gold",
  sage: "bg-accent-sage-dim text-accent-sage",
  rose: "bg-accent-rose-dim text-accent-rose",
  neutral: "bg-accent-neutral-dim text-accent-neutral",
};

function KpiInner({
  icon,
  label,
  value,
  delta,
  color = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  delta?: string;
  color?: string;
}) {
  return (
    <div className="card p-5 h-full">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] mb-3 ${iconColorClasses[color] ?? iconColorClasses.neutral}`}
      >
        {icon}
      </div>
      <div className="font-mono text-2xl font-semibold text-text-primary">{value}</div>
      <div className="text-sm text-text-muted mt-0.5">{label}</div>
      {delta && <div className="text-xs text-text-faint mt-1.5">{delta}</div>}
    </div>
  );
}

export function KpiCard(props: Parameters<typeof KpiInner>[0] & { href?: string }) {
  if (props.href) {
    return (
      <Link href={props.href} className="block hover:-translate-y-0.5 transition-transform">
        <KpiInner {...props} />
      </Link>
    );
  }
  return <KpiInner {...props} />;
}
