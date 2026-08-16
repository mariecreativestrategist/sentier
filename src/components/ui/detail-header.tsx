import type { ReactNode } from "react";

export function DetailHeader({
  icon,
  title,
  subtitle,
  badge,
  stats,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  stats?: { label: string; value: ReactNode }[];
  actions?: ReactNode;
}) {
  return (
    <div className="card p-6 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-dim text-primary text-lg font-semibold">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
              {badge}
            </div>
            {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      </div>
      {stats && stats.length > 0 && (
        <div className="flex gap-8 mt-5 pt-5 border-t border-border-soft flex-wrap">
          {stats.map((s, i) => (
            <div key={i}>
              <div className="font-mono text-base font-semibold text-text-primary">{s.value}</div>
              <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
