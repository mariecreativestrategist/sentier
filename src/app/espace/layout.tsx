import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import type { NavGroup } from "@/components/shell/sidebar-nav";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/app/login/actions";

export default async function EspaceLayout({ children }: LayoutProps<"/espace">) {
  const profile = await requireProfile("learner");
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("formations(name)")
    .eq("learner_id", profile.id)
    .maybeSingle();

  const formationName = (enrollment?.formations as unknown as { name: string } | null)?.name;

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/espace", label: "Dashboard", icon: "🏠", exact: true },
        { href: "/espace/formation", label: "Ma formation", icon: "📚" },
        { href: "/espace/coaching", label: "Coaching", icon: "🗓️" },
        { href: "/espace/messagerie", label: "Messagerie", icon: "💬" },
        { href: "/espace/communaute", label: "Communauté", icon: "💭" },
        { href: "/espace/documents", label: "Documents", icon: "🗂️" },
        { href: "/espace/certificat", label: "Certificat", icon: "🎓" },
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
            <p className="text-[11px] text-sidebar-text truncate">{formationName ?? "Aucune formation"}</p>
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
