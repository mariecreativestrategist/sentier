import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { deriveModuleWaypoints } from "@/lib/module-state";

const stateLabel: Record<string, string> = { done: "Terminé", current: "En cours", todo: "À venir" };

export default async function MaFormationPage() {
  const profile = await requireProfile("learner");
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, progress, formation_id, formations(name)")
    .eq("learner_id", profile.id)
    .maybeSingle();

  if (!enrollment) {
    return (
      <div className="card">
        <EmptyState icon="📭" title="Aucune formation en cours" />
      </div>
    );
  }

  const { data: modules } = await supabase
    .from("modules")
    .select("id, name, position")
    .eq("formation_id", enrollment.formation_id)
    .order("position");
  const { data: progress } = await supabase
    .from("module_progress")
    .select("module_id")
    .eq("enrollment_id", enrollment.id)
    .eq("state", "done");

  const waypoints = deriveModuleWaypoints(modules ?? [], new Set((progress ?? []).map((p) => p.module_id)));
  const formationName = (enrollment.formations as unknown as { name: string } | null)?.name ?? "—";

  return (
    <div>
      <h1 className="text-lg font-semibold text-text-primary mb-1">{formationName}</h1>
      <div className="mb-6 max-w-xs">
        <ProgressBar value={enrollment.progress} />
      </div>

      <div className="card divide-y divide-border-soft">
        {(modules ?? []).length === 0 ? (
          <EmptyState icon="🧩" title="Pas encore de modules publiés" />
        ) : (
          (modules ?? []).map((m, i) => (
            <Link
              key={m.id}
              href={`/espace/formation/${m.id}`}
              className="flex items-center gap-3 px-5 py-4 hover:bg-bg-elevated-2"
            >
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shrink-0 " +
                  (waypoints[i].state === "done"
                    ? "bg-success text-white"
                    : waypoints[i].state === "current"
                      ? "bg-primary text-white"
                      : "bg-bg-elevated-2 text-text-faint")
                }
              >
                {waypoints[i].state === "done" ? "✓" : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{m.name}</p>
                <p className="text-xs text-text-muted mt-0.5">{stateLabel[waypoints[i].state]}</p>
              </div>
              <span className="text-text-faint">›</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
