import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formationStatusLabel } from "@/lib/format";
import { createFormation } from "./actions";

const statusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  live: "success",
  full: "warning",
  paused: "warning",
  done: "primary",
};

const filters = [
  { key: "all", label: "Toutes" },
  { key: "live", label: "En cours" },
  { key: "draft", label: "Brouillons" },
  { key: "done", label: "Terminées" },
];

export default async function FormationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireProfile("coach");
  const { status } = await searchParams;
  const activeFilter = status ?? "all";
  const supabase = await createClient();

  let query = supabase
    .from("formations")
    .select("id, name, format, status, created_at")
    .order("created_at", { ascending: false });
  if (activeFilter !== "all") query = query.eq("status", activeFilter);

  const { data: formations } = await query;

  const { data: modulesCount } = await supabase.from("modules").select("id, formation_id");
  const { data: enrollments } = await supabase.from("enrollments").select("formation_id, progress");

  const moduleCountByFormation = new Map<string, number>();
  (modulesCount ?? []).forEach((m) => {
    moduleCountByFormation.set(m.formation_id, (moduleCountByFormation.get(m.formation_id) ?? 0) + 1);
  });

  const statsByFormation = new Map<string, { count: number; avgProgress: number }>();
  (enrollments ?? []).forEach((e) => {
    const cur = statsByFormation.get(e.formation_id) ?? { count: 0, avgProgress: 0 };
    cur.avgProgress = (cur.avgProgress * cur.count + e.progress) / (cur.count + 1);
    cur.count += 1;
    statsByFormation.set(e.formation_id, cur);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-text-primary">Formations</h1>
        <details className="relative">
          <summary className="list-none cursor-pointer rounded-[var(--radius-sm)] bg-primary text-white text-sm font-medium px-3.5 py-2 hover:opacity-90">
            + Nouvelle formation
          </summary>
          <form
            action={createFormation}
            className="card absolute right-0 mt-2 w-80 p-4 z-10 space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Nom</label>
              <input
                name="name"
                required
                className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Format</label>
              <select
                name="format"
                className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              >
                <option>Cohorte + coaching individuel</option>
                <option>Cohorte + ateliers de groupe</option>
                <option>Coaching 1:1 uniquement</option>
                <option>Contenu autonome</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
              <textarea
                name="description"
                rows={3}
                className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <SubmitButton className="w-full" pendingLabel="Création...">
              Créer
            </SubmitButton>
          </form>
        </details>
      </div>

      <div className="flex gap-1 border-b border-border-soft mb-5">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/formations" : `/admin/formations?status=${f.key}`}
            className={
              "px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition " +
              (activeFilter === f.key
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-primary")
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        {formations && formations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-soft text-left text-xs text-text-muted">
                  <th className="px-5 py-3 font-medium">Formation</th>
                  <th className="px-5 py-3 font-medium">Format</th>
                  <th className="px-5 py-3 font-medium">Apprenants</th>
                  <th className="px-5 py-3 font-medium">Progression moy.</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {formations.map((f) => {
                  const stats = statsByFormation.get(f.id) ?? { count: 0, avgProgress: 0 };
                  return (
                    <tr key={f.id} className="border-b border-border-soft last:border-0 hover:bg-bg-elevated-2">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/formations/${f.id}`} className="block">
                          <p className="font-medium text-text-primary">{f.name}</p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {moduleCountByFormation.get(f.id) ?? 0} module(s) · {f.format}
                          </p>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-text-muted">{f.format}</td>
                      <td className="px-5 py-3.5 font-mono">{stats.count}</td>
                      <td className="px-5 py-3.5">
                        <ProgressBar value={Math.round(stats.avgProgress)} />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge label={formationStatusLabel[f.status]} tone={statusTone[f.status]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="📚" title="Aucune formation" description="Crée ta première formation pour commencer." />
        )}
      </div>
    </div>
  );
}
