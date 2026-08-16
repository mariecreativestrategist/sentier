import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DetailHeader } from "@/components/ui/detail-header";
import { Subtabs } from "@/components/ui/subtabs";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formationStatusLabel } from "@/lib/format";
import { addModule, enrollLearner, updateFormationDescription } from "./actions";
import { updateFormationStatus } from "../actions";

const statusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  live: "success",
  full: "warning",
  paused: "warning",
  done: "primary",
};

export default async function FormationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ formationId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireProfile("coach");
  const { formationId } = await params;
  const { tab } = await searchParams;
  const activeTab = tab ?? "apercu";
  const supabase = await createClient();

  const { data: formation } = await supabase.from("formations").select("*").eq("id", formationId).single();
  if (!formation) notFound();

  const [{ data: modules }, { data: enrollments }, { data: allLearners }] = await Promise.all([
    supabase.from("modules").select("id, name, position").eq("formation_id", formationId).order("position"),
    supabase
      .from("enrollments")
      .select("id, learner_id, progress, profiles(full_name, avatar_color, email)")
      .eq("formation_id", formationId),
    supabase.from("profiles").select("id, full_name").eq("role", "learner").order("full_name"),
  ]);

  const moduleIds = (modules ?? []).map((m) => m.id);
  const [{ data: chapters }, { data: exercises }, { data: questions }] = await Promise.all([
    moduleIds.length
      ? supabase.from("chapters").select("id, module_id").in("module_id", moduleIds)
      : Promise.resolve({ data: [] }),
    moduleIds.length
      ? supabase.from("exercises").select("id, module_id").in("module_id", moduleIds)
      : Promise.resolve({ data: [] }),
    moduleIds.length
      ? supabase.from("quiz_questions").select("id, module_id").in("module_id", moduleIds)
      : Promise.resolve({ data: [] }),
  ]);

  const countBy = (rows: { module_id: string }[] | null, id: string) =>
    (rows ?? []).filter((r) => r.module_id === id).length;

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.learner_id));
  const availableLearners = (allLearners ?? []).filter((l) => !enrolledIds.has(l.id));
  const avgProgress =
    enrollments && enrollments.length > 0
      ? Math.round(enrollments.reduce((s, e) => s + e.progress, 0) / enrollments.length)
      : 0;

  return (
    <div>
      <Link href="/admin/formations" className="text-sm text-text-muted hover:text-primary mb-4 inline-block">
        ← Formations
      </Link>

      <DetailHeader
        icon="📚"
        title={formation.name}
        subtitle={formation.format}
        badge={<StatusBadge label={formationStatusLabel[formation.status]} tone={statusTone[formation.status]} />}
        stats={[
          { label: "Apprenants", value: enrollments?.length ?? 0 },
          { label: "Progression moy.", value: `${avgProgress}%` },
          { label: "Modules", value: modules?.length ?? 0 },
        ]}
        actions={
          <form
            action={async (fd: FormData) => {
              "use server";
              await updateFormationStatus(formationId, String(fd.get("status")));
            }}
            className="flex items-center gap-2"
          >
            <select
              name="status"
              defaultValue={formation.status}
              className="rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm"
            >
              {Object.entries(formationStatusLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <SubmitButton variant="ghost" pendingLabel="...">
              Mettre à jour
            </SubmitButton>
          </form>
        }
      />

      <Subtabs
        basePath={`/admin/formations/${formationId}`}
        active={activeTab}
        tabs={[
          { key: "apercu", label: "Aperçu" },
          { key: "modules", label: "Modules" },
          { key: "apprenants", label: "Apprenants inscrits" },
        ]}
      />

      {activeTab === "apercu" && (
        <div className="card p-6">
          <form action={updateFormationDescription.bind(null, formationId)} className="space-y-3">
            <label className="block text-sm font-medium text-text-primary">Description</label>
            <textarea
              name="description"
              defaultValue={formation.description}
              rows={5}
              className="w-full rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <SubmitButton pendingLabel="Enregistrement...">Enregistrer</SubmitButton>
          </form>
        </div>
      )}

      {activeTab === "modules" && (
        <div className="card divide-y divide-border-soft">
          {modules && modules.length > 0 ? (
            modules.map((m, i) => (
              <Link
                key={m.id}
                href={`/admin/formations/${formationId}/modules/${m.id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-bg-elevated-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-dim text-primary text-xs font-semibold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{m.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {countBy(chapters, m.id)} chapitre(s) · {countBy(exercises, m.id)} exercice(s) ·{" "}
                    {countBy(questions, m.id)} question(s) de quiz
                  </p>
                </div>
                <span className="text-text-faint">›</span>
              </Link>
            ))
          ) : (
            <EmptyState icon="🧩" title="Aucun module" description="Ajoute un premier module ci-dessous." />
          )}
          <form action={addModule.bind(null, formationId)} className="flex gap-2 px-5 py-4">
            <input
              name="name"
              required
              placeholder="Nom du nouveau module"
              className="flex-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
            />
            <SubmitButton pendingLabel="Ajout...">+ Ajouter un module</SubmitButton>
          </form>
        </div>
      )}

      {activeTab === "apprenants" && (
        <div className="card overflow-hidden">
          {enrollments && enrollments.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-soft text-left text-xs text-text-muted">
                  <th className="px-5 py-3 font-medium">Apprenant</th>
                  <th className="px-5 py-3 font-medium">Progression</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => {
                  const learner = e.profiles as unknown as { full_name: string; avatar_color: string; email: string } | null;
                  return (
                    <tr key={e.id} className="border-b border-border-soft last:border-0 hover:bg-bg-elevated-2">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/apprenants/${e.learner_id}`} className="flex items-center gap-2.5">
                          <Avatar name={learner?.full_name ?? "—"} color={learner?.avatar_color} size="sm" />
                          <div>
                            <p className="font-medium text-text-primary">{learner?.full_name}</p>
                            <p className="text-xs text-text-muted">{learner?.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <ProgressBar value={e.progress} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState icon="👥" title="Aucun apprenant inscrit" />
          )}
          {availableLearners.length > 0 && (
            <form action={enrollLearner.bind(null, formationId)} className="flex gap-2 px-5 py-4 border-t border-border-soft">
              <select
                name="learnerId"
                required
                className="flex-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm"
              >
                <option value="">Choisir un apprenant à inscrire…</option>
                {availableLearners.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name}
                  </option>
                ))}
              </select>
              <SubmitButton pendingLabel="Inscription...">Inscrire</SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
