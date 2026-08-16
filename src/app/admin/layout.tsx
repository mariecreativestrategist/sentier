import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import type { NavGroup } from "@/components/shell/sidebar-nav";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/app/login/actions";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireProfile("coach");
  const supabase = await createClient();

  const [{ count: learnerCount }, { count: formationCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "learner"),
    supabase.from("formations").select("*", { count: "exact", head: true }),
  ]);

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/admin", label: "Dashboard", icon: "🏠", exact: true },
        { href: "/admin/formations", label: "Formations", icon: "📚", badge: String(formationCount ?? 0) },
        { href: "/admin/apprenants", label: "Apprenants", icon: "👥", badge: String(learnerCount ?? 0) },
      ],
    },
    {
      title: "Accompagnement",
      items: [
        { href: "/admin/coaching", label: "Sessions coaching", icon: "🗓️" },
        { href: "/admin/messagerie", label: "Messagerie", icon: "💬" },
        { href: "/admin/communaute", label: "Communauté", icon: "💭" },
        { href: "/admin/ressources", label: "Ressources", icon: "📁" },
      ],
    },
    {
      title: "Business",
      items: [
        { href: "/admin/facturation", label: "Facturation", icon: "💳" },
        { href: "/admin/administratif", label: "Administratif", icon: "🗂️" },
        { href: "/admin/parametres", label: "Paramètres", icon: "⚙️" },
      ],
    },
  ];

  return (
    <AppShell
      groups={groups}
      footer={
        <div className="flex items-center gap-2.5 px-1">
          <Avatar name={profile.full_name} color={profile.avatar_color} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-sidebar-text-hover truncate">{profile.full_name}</p>
            <p className="text-[11px] text-sidebar-text truncate">Formateur</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sidebar-text hover:text-sidebar-text-hover text-xs"
              title="Se déconnecter"
            >
              ⏻
            </button>
          </form>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
