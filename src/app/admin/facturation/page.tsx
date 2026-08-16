import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";
import { addPayment, updatePaymentStatus } from "./actions";

const statusLabel: Record<string, string> = { paye: "Payé", echec: "Échec", en_attente: "En attente" };
const statusTone: Record<string, BadgeTone> = { paye: "success", echec: "danger", en_attente: "warning" };

export default async function FacturationPage() {
  await requireProfile("coach");
  const supabase = await createClient();

  const [{ data: payments }, { data: learners }, { data: formations }] = await Promise.all([
    supabase.from("payments").select("*, profiles(full_name, avatar_color), formations(name)").order("due_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "learner").order("full_name"),
    supabase.from("formations").select("id, name").order("name"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-text-primary">Facturation</h1>
        <details>
          <summary className="list-none cursor-pointer rounded-[var(--radius-sm)] bg-primary text-white text-sm font-medium px-3.5 py-2 hover:opacity-90">
            Nouvelle facture
          </summary>
          <form action={addPayment} className="card absolute right-8 mt-2 w-80 p-4 space-y-3 z-10">
            <select name="learnerId" required className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm">
              <option value="">Apprenant…</option>
              {(learners ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.full_name}</option>
              ))}
            </select>
            <select name="formationId" required className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm">
              <option value="">Formation…</option>
              {(formations ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <input type="number" name="amount" step="0.01" required placeholder="Montant (€)" className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm" />
            <input type="date" name="dueDate" required className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm" />
            <SubmitButton className="w-full" pendingLabel="Création...">Créer</SubmitButton>
          </form>
        </details>
      </div>

      <div className="card overflow-hidden">
        {!payments || payments.length === 0 ? (
          <EmptyState icon="💳" title="Aucun paiement enregistré" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-xs text-text-muted">
                <th className="px-5 py-3 font-medium">Apprenant</th>
                <th className="px-5 py-3 font-medium">Formation</th>
                <th className="px-5 py-3 font-medium">Montant</th>
                <th className="px-5 py-3 font-medium">Échéance</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const learner = p.profiles as unknown as { full_name: string } | null;
                const formation = p.formations as unknown as { name: string } | null;
                return (
                  <tr key={p.id} className="border-b border-border-soft last:border-0">
                    <td className="px-5 py-3.5 font-medium text-text-primary">{learner?.full_name}</td>
                    <td className="px-5 py-3.5 text-text-muted">{formation?.name}</td>
                    <td className="px-5 py-3.5 font-mono">{p.amount.toFixed(2)} €</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-text-muted">{formatDate(p.due_date)}</td>
                    <td className="px-5 py-3.5">
                      <form action={updatePaymentStatus.bind(null, p.id)} className="flex items-center gap-2">
                        <select
                          name="status"
                          defaultValue={p.status}
                          className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs"
                        >
                          {Object.entries(statusLabel).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <SubmitButton variant="ghost" pendingLabel="...">
                          <StatusBadge label={statusLabel[p.status]} tone={statusTone[p.status]} />
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
