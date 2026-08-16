import type { ReactNode } from "react";
import { SidebarNav, type NavGroup } from "./sidebar-nav";

export function AppShell({
  groups,
  footer,
  children,
}: {
  groups: NavGroup[];
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-[236px] shrink-0 bg-sidebar-bg flex flex-col border-r border-sidebar-border">
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-sidebar-border shrink-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold">
            S
          </span>
          <span className="text-sidebar-text-hover font-semibold text-[15px]">Sentier</span>
        </div>
        <SidebarNav groups={groups} />
        <div className="border-t border-sidebar-border p-3 shrink-0">{footer}</div>
      </aside>
      <main className="flex-1 min-w-0 px-8 py-7">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
