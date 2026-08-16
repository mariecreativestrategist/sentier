import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { NewLearnerForm } from "./new-learner-form";

export default async function ApprenantsPage() {
  await requireProfile("coach");
  const supabase = await createClient();

  const [{ data: learners }, { data: enrollments }, { data: sessions }, { data: formations }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, avatar_color").eq("role", "learner").order("full_name"),
    supabase.from("enrollments").select("learner_id, progress, formations(name)"),
    supabase
      .from("coaching_sessions")
      .select("learner_id, scheduled_at")
      .eq("status", "a_venir")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true }),
    supabase.from("formations").select("id, name").order("name"),
  ]);

  const enrollmentByLearner = new Map((enrollments ?? []).map((e) => [e.learner_id, e]));
  const nextSessionByLearner = new Map<string, string>();
  (sessions ?? []).forEach((s) => {
    if (!nextSessionByLearner.has(s.learner_id)) nextSessionByLearner.set(s.learner_id, s.scheduled_at);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Apprenants</h1>

      <NewLearnerForm formations={formations ?? []} />

      <div className="card overflow-hidden">
        {learners && learners.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-xs text-text-muted">
                <th className="px-5 py-3 font-medium">Apprenant</th>
                <th className="px-5 py-3 font-medium">Formation</th>
                <th className="px-5 py-3 font-medium">Progression</th>
                <th className="px-5 py-3 font-medium">Prochaine session</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((l) => {
                const enr = enrollmentByLearner.get(l.id);
                const formationName = (enr?.formations as unknown as { name: string } | null)?.name;
                const nextSession = nextSessionByLearner.get(l.id);
                return (
                  <tr key={l.id} className="border-b border-border-soft last:border-0 hover:bg-bg-elevated-2">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/apprenants/${l.id}`} className="flex items-center gap-2.5">
                        <Avatar name={l.full_name} color={l.avatar_color} size="sm" />
                        <div>
                          <p className="font-medium text-text-primary">{l.full_name}</p>
                          <p className="text-xs text-text-muted">{l.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-text-muted">{formationName ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <ProgressBar value={enr?.progress ?? 0} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-text-muted">
                      {nextSession ? formatDate(nextSession) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState icon="👥" title="Aucun apprenant" description="Ajoute ton premier apprenant ci-dessus." />
        )}
      </div>
    </div>
  );
}
