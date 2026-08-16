import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { FileChip } from "@/components/ui/file-chip";
import { docTypeLabel, formatDate } from "@/lib/format";
import { submitDocForm } from "./actions";

const filters = [
  { key: "all", label: "Tous" },
  { key: "facture", label: "Factures" },
  { key: "contrat", label: "Contrats" },
  { key: "autre", label: "Autres" },
];

export default async function AdministratifPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireProfile("coach");
  const { type } = await searchParams;
  const activeFilter = type ?? "all";
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("*, formations(name), profiles(full_name)")
    .order("created_at", { ascending: false });
  if (activeFilter !== "all") query = query.eq("type", activeFilter);
  const { data: documents } = await query;

  const [{ data: formations }, { data: learners }] = await Promise.all([
    supabase.from("formations").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").eq("role", "learner").order("full_name"),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-text-primary mb-6">Administratif</h1>

      <div className="flex gap-1 border-b border-border-soft mb-5">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/administratif" : `/admin/administratif?type=${f.key}`}
            className={
              "px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition " +
              (activeFilter === f.key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-primary")
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden mb-6">
        {!documents || documents.length === 0 ? (
          <EmptyState icon="🗂️" title="Aucun document" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-xs text-text-muted">
                <th className="px-5 py-3 font-medium">Document</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Formation</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-border-soft last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-text-primary">{d.title}</p>
                    {d.filename && (
                      <div className="mt-1">
                        <FileChip filename={d.filename} />
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge label={docTypeLabel[d.type]} tone="neutral" />
                  </td>
                  <td className="px-5 py-3.5 text-text-muted">{(d.formations as unknown as { name: string } | null)?.name ?? "Général"}</td>
                  <td className="px-5 py-3.5 text-text-muted">{(d.profiles as unknown as { full_name: string } | null)?.full_name ?? "—"}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-text-muted">{formatDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <details className="card p-5">
        <summary className="cursor-pointer text-sm font-medium text-primary list-none">+ Ajouter un document</summary>
        <form action={submitDocForm} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <input
            name="title"
            required
            placeholder="Titre du document"
            className="sm:col-span-2 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
          />
          <select name="type" className="rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm">
            <option value="facture">Facture</option>
            <option value="contrat">Contrat</option>
            <option value="autre">Autre</option>
          </select>
          <input type="file" name="file" className="text-xs self-center" />
          <select name="formationId" className="rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm">
            <option value="">Formation (facultatif — document général)</option>
            {(formations ?? []).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select name="learnerId" className="rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm">
            <option value="">Apprenant (facultatif)</option>
            {(learners ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.full_name}</option>
            ))}
          </select>
          <SubmitButton className="sm:col-span-2" pendingLabel="Ajout...">Ajouter le document</SubmitButton>
        </form>
      </details>
    </div>
  );
}
