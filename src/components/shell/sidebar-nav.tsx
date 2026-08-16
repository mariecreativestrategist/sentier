"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string;
  exact?: boolean;
};

export type NavGroup = {
  title?: string;
  items: NavItem[];
};

export function SidebarNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.title && (
            <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-text/70">
              {group.title}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/") || pathname.startsWith(item.href + "?");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm transition " +
                    (active
                      ? "bg-sidebar-active-bg text-sidebar-text-active font-medium"
                      : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-hover")
                  }
                >
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center text-[15px] leading-none">
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-sidebar-badge-bg px-1.5 py-0.5 text-[10px] font-mono text-sidebar-text-active">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
