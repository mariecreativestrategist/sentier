import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/ui/kpi-card";
import { JourneyTrail } from "@/components/ui/journey-trail";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { deriveModuleWaypoints } from "@/lib/module-state";

export default async function AdminDashboardPage() {
  const profile = await requireProfile("coach");
  const supabase = await createClient();

  const now = new Date().toISOString();

  const [
    { count: learnerCount },
    { count: liveFormationCount },
    { count: upcomingSessionsCount },
    { data: enrollmentsForAvg },
    { data: upcomingSessions },
    { data: recentEnrollments },
    { data: recentSubmissions },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "learner"),
    supabase.from("formations").select("*", { count: "exact", head: true }).eq("status", "live"),
    supabase
      .from("coaching_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "a_venir")
      .gte("scheduled_at", now),
    supabase.from("enrollments").select("progress"),
    supabase
      .from("coaching_sessions")
      .select("id, title, scheduled_at, profiles(full_name, avatar_color)")
      .eq("status", "a_venir")
      .gte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase
      .from("enrollments")
      .select("id, created_at, learner_id, profiles(full_name), formations(name)")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("exercise_submissions")
      .select("id, submitted_at, status, profiles(full_name), exercises(title)")
      .order("submitted_at", { ascending: false })
      .limit(3),
  ]);

  const avgProgress =
    enrollmentsForAvg && enrollmentsForAvg.length > 0
      ? Math.round(enrollmentsForAvg.reduce((sum, e) => sum + e.progress, 0) / enrollmentsForAvg.length)
      : 0;

  const { data: activeEnrollments } = await supabase
    .from("enrollments")
    .select("id, learner_id, formation_id, profiles(full_name, avatar_color), formations(name)")
    .order("created_at", { ascending: false })
    .limit(4);

  const trails = await Promise.all(
    (activeEnrollments ?? []).map(async (enr) => {
      const { data: modules } = await supabase
        .from("modules")
        .select("id, name, position")
        .eq("formation_id", enr.formation_id)
        .order("position");

      const { data: progress } = await supabase
        .from("module_progress")
        .select("module_id")
        .eq("enrollment_id", enr.id)
        .eq("state", "done");

      const doneIds = new Set((progress ?? []).map((p) => p.module_id));
      const waypoints = deriveModuleWaypoints(modules ?? [], doneIds);

      const learner = enr.profiles as unknown as { full_name: string; avatar_color: string } | null;
      const formation = enr.formations as unknown as { name: string } | null;

      return {
        id: enr.id,
        learnerId: enr.learner_id,
        learnerName: learner?.full_name ?? "—",
        avatarColor: learner?.avatar_color ?? "neutral",
        formationName: formation?.name ?? "—",
        waypoints,
      };
    })
  );

  const activity = [
    ...(recentEnrollments ?? []).map((e) => ({
      key: `enr-${e.id}`,
      date: e.created_at as string,
      text: `${(e.profiles as unknown as { full_name: string } | null)?.full_name ?? "Un apprenant"} a rejoint ${(e.formations as unknown as { name: string } | null)?.name ?? "une formation"}`,
      tone: "success" as const,
    })),
    ...(recentSubmissions ?? []).map((s) => ({
      key: `sub-${s.id}`,
      date: s.submitted_at as string,
      text: `${(s.profiles as unknown as { full_name: string } | null)?.full_name ?? "Un apprenant"} a soumis « ${(s.exercises as unknown as { title: string } | null)?.title ?? "un exercice"} »`,
      tone: s.status === "corrige" ? ("success" as const) : ("primary" as const),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Bonjour {profile.full_name.split(" ")[0]}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {upcomingSessionsCount ?? 0} session{(upcomingSessionsCount ?? 0) > 1 ? "s" : ""} de coaching à venir
          </p>
        </div>
        <Link
          href="/admin/formations"
          className="rounded-[var(--radius-sm)] bg-primary text-white text-sm font-medium px-3.5 py-2 hover:opacity-90"
        >
          + Nouvelle formation
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon="👥" label="Apprenants actifs" value={learnerCount ?? 0} color="sage" href="/admin/apprenants" />
        <KpiCard icon="📚" label="Formations en cours" value={liveFormationCount ?? 0} color="gold" href="/admin/formations" />
        <KpiCard icon="🗓️" label="Sessions coaching planifiées" value={upcomingSessionsCount ?? 0} color="rose" href="/admin/coaching" />
        <KpiCard icon="📈" label="Taux de complétion moyen" value={`${avgProgress}%`} color="neutral" />
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-5">Parcours en cours</h2>
        {trails.length === 0 ? (
          <EmptyState icon="🧭" title="Aucun apprenant actif pour l'instant" />
        ) : (
          <div className="space-y-6">
            {trails.map((t) => (
              <Link key={t.id} href={`/admin/apprenants/${t.learnerId}`} className="block">
                <div className="flex items-center gap-3 mb-2.5">
                  <Avatar name={t.learnerName} color={t.avatarColor} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{t.learnerName}</p>
                    <p className="text-xs text-text-muted">{t.formationName}</p>
                  </div>
                </div>
                <JourneyTrail waypoints={t.waypoints} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Prochaines sessions coaching</h2>
          {upcomingSessions && upcomingSessions.length > 0 ? (
            <ul className="space-y-3">
              {upcomingSessions.map((s) => {
                const learner = s.profiles as unknown as { full_name: string; avatar_color: string } | null;
                return (
                  <li key={s.id} className="flex items-center gap-3">
                    <Avatar name={learner?.full_name ?? "—"} color={learner?.avatar_color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary truncate">{s.title}</p>
                      <p className="text-xs text-text-muted">{learner?.full_name}</p>
                    </div>
                    <span className="font-mono text-xs text-text-muted whitespace-nowrap">
                      {formatDateTime(s.scheduled_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon="🗓️" title="Rien de planifié" />
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Activité récente</h2>
          {activity.length > 0 ? (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.key} className="flex items-start gap-2.5">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${a.tone === "success" ? "bg-success" : "bg-primary"}`}
                  />
                  <p className="text-sm text-text-primary">{a.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="✨" title="Pas encore d'activité" />
          )}
        </div>
      </div>
    </div>
  );
}
