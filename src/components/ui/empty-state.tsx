import type { ReactNode } from "react";

export function EmptyState({
  icon = "○",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-bg-elevated-2 text-text-faint text-lg mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && <p className="text-sm text-text-muted mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
