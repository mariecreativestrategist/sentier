import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FileChip } from "@/components/ui/file-chip";
import { docTypeLabel, formatDate } from "@/lib/format";

export default async function EspaceDocumentsPage() {
  await requireProfile("learner");
  const supabase = await createClient();

  // RLS's documents_select policy already scopes this to: docs assigned to
  // this learner, docs for their formation, or fully general docs.
  const { data: documents } = await supabase
    .from("documents")
    .select("*, storage_path")
    .order("created_at", { ascending: false });

  const withUrls = await Promise.all(
    (documents ?? []).map(async (d) => {
      if (!d.storage_path) return { ...d, url: null as string | null };
      const { data } = await supabase.storage.from("files").createSignedUrl(d.storage_path, 3600);
      return { ...d, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div>
      <h1 className="text-lg font-semibold text-text-primary mb-6">Documents</h1>
      <div className="card overflow-hidden">
        {withUrls.length === 0 ? (
          <EmptyState icon="🗂️" title="Aucun document" />
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {withUrls.map((d) => (
                <tr key={d.id} className="border-b border-border-soft last:border-0">
                  <td className="px-5 py-3.5 font-medium text-text-primary">{d.title}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge label={docTypeLabel[d.type]} tone="neutral" />
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-text-muted">{formatDate(d.created_at)}</td>
                  <td className="px-5 py-3.5">
                    {d.filename &&
                      (d.url ? (
                        <a href={d.url} target="_blank" rel="noreferrer">
                          <FileChip filename={d.filename} />
                        </a>
                      ) : (
                        <FileChip filename={d.filename} />
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
