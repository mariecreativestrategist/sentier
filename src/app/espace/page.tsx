import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/ui/kpi-card";
import { JourneyTrail } from "@/components/ui/journey-trail";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { deriveModuleWaypoints } from "@/lib/module-state";

export default async function EspaceDashboardPage() {
  const profile = await requireProfile("learner");
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, progress, formation_id, formations(name)")
    .eq("learner_id", profile.id)
    .maybeSingle();

  if (!enrollment) {
    return (
      <div className="card">
        <EmptyState
          icon="📭"
          title="Aucune formation en cours"
          description="Ton formateur n'a pas encore associé de formation à ton compte."
        />
      </div>
    );
  }

  const formationName = (enrollment.formations as unknown as { name: string } | null)?.name ?? "—";

  const [{ data: modules }, { data: progressRows }, { data: nextSession }, { data: posts }] = await Promise.all([
    supabase.from("modules").select("id, name, position").eq("formation_id", enrollment.formation_id).order("position"),
    supabase.from("module_progress").select("module_id, state").eq("enrollment_id", enrollment.id),
    supabase
      .from("coaching_sessions")
      .select("id, title, scheduled_at")
      .eq("learner_id", profile.id)
      .eq("status", "a_venir")
      .gte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("posts").select("id, body, author_id, created_at, profiles(full_name)").order("created_at", { ascending: false }).limit(3),
  ]);

  const doneIds = new Set((progressRows ?? []).filter((p) => p.state === "done").map((p) => p.module_id));
  const waypoints = deriveModuleWaypoints(modules ?? [], doneIds);
  const modulesWithState = (modules ?? []).map((m, i) => ({ ...m, state: waypoints[i]?.state ?? "todo" }));

  const doneCount = modulesWithState.filter((m) => m.state === "done").length;
  const currentModule =
    modulesWithState.find((m) => m.state === "current") ?? modulesWithState[modulesWithState.length - 1];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">Bonjour {profile.full_name.split(" ")[0]}</h1>
        <p className="text-sm text-text-muted mt-0.5">{formationName}</p>
      </div>

      {currentModule && (
        <div className="rounded-[var(--radius)] bg-gradient-to-r from-primary to-[#5c78e0] text-white p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/80 mb-1">Continue là où tu t&apos;es arrêté·e</p>
            <p className="text-lg font-semibold">{currentModule.name}</p>
          </div>
          <Link
            href={`/espace/formation/${currentModule.id}`}
            className="rounded-[var(--radius-sm)] bg-white text-primary text-sm font-medium px-4 py-2 hover:opacity-90 shrink-0"
          >
            Continuer →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard icon="📈" label="Progression globale" value={`${enrollment.progress}%`} color="sage" />
        <KpiCard
          icon="✅"
          label="Modules terminés"
          value={`${doneCount}/${modulesWithState.length}`}
          color="gold"
          href="/espace/formation"
        />
        <KpiCard
          icon="🗓️"
          label="Sessions coaching"
          value={nextSession ? 1 : 0}
          color="rose"
          href="/espace/coaching"
        />
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-5">Mon parcours</h2>
        {waypoints.length > 0 ? (
          <JourneyTrail waypoints={waypoints} />
        ) : (
          <EmptyState icon="🧭" title="Pas encore de modules publiés" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Prochaine session de coaching</h2>
          {nextSession ? (
            <div>
              <p className="text-sm text-text-primary">{nextSession.title}</p>
              <p className="font-mono text-xs text-text-muted mt-1">{formatDateTime(nextSession.scheduled_at)}</p>
            </div>
          ) : (
            <EmptyState
              icon="🗓️"
              title="Rien de planifié"
              action={
                <Link href="/espace/coaching" className="text-sm text-primary font-medium">
                  Réserver un créneau →
                </Link>
              }
            />
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Dernières nouvelles de la communauté</h2>
          {posts && posts.length > 0 ? (
            <ul className="space-y-3">
              {posts.map((p) => (
                <li key={p.id} className="text-sm">
                  <span className="font-medium text-text-primary">
                    {(p.profiles as unknown as { full_name: string } | null)?.full_name ?? "—"}
                  </span>{" "}
                  <span className="text-text-muted">
                    {p.body.length > 70 ? `${p.body.slice(0, 70)}…` : p.body}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="💭" title="Pas encore de publication" />
          )}
        </div>
      </div>
    </div>
  );
}
