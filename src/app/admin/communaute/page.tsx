import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { createChannel, publishPost } from "./actions";

export default async function CommunautePage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  await requireProfile("coach");
  const { channel } = await searchParams;
  const supabase = await createClient();

  const [{ data: channels }, { data: formations }] = await Promise.all([
    supabase.from("channels").select("*").order("created_at"),
    supabase.from("formations").select("id, name").order("name"),
  ]);

  const active = (channels ?? []).find((c) => c.id === channel) ?? channels?.[0];

  const { data: posts } = active
    ? await supabase
        .from("posts")
        .select("*, profiles(full_name, avatar_color)")
        .eq("channel_id", active.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div>
      <h1 className="text-lg font-semibold text-text-primary mb-6">Communauté</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <div className="card divide-y divide-border-soft">
          {(channels ?? []).map((c) => (
            <Link
              key={c.id}
              href={`/admin/communaute?channel=${c.id}`}
              className={`flex items-center justify-between gap-2 px-4 py-3 text-sm ${active?.id === c.id ? "bg-primary-dim text-primary font-medium" : "text-text-primary hover:bg-bg-elevated-2"}`}
            >
              <span className="truncate">{c.name}</span>
              {c.post_permission === "coach" && <span title="Lecture seule pour les apprenants">🔒</span>}
            </Link>
          ))}
          <details className="p-4">
            <summary className="cursor-pointer text-sm font-medium text-primary list-none">+ Nouveau canal</summary>
            <form action={createChannel} className="space-y-3 mt-3">
              <input
                name="name"
                required
                placeholder="Nom du canal"
                className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
              <div>
                <p className="text-xs font-medium text-text-muted mb-1">Qui peut publier ?</p>
                <label className="flex items-center gap-2 text-sm mb-1">
                  <input type="radio" name="postPermission" value="all" defaultChecked /> Tout le monde
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="postPermission" value="coach" /> Seulement moi
                </label>
              </div>
              <div>
                <p className="text-xs font-medium text-text-muted mb-1">Accès</p>
                <label className="flex items-center gap-2 text-sm mb-1.5">
                  <input type="checkbox" name="accessAll" defaultChecked /> Tous les apprenants
                </label>
                <div className="pl-1 space-y-1">
                  {(formations ?? []).map((f) => (
                    <label key={f.id} className="flex items-center gap-2 text-xs text-text-muted">
                      <input type="checkbox" name="formationIds" value={f.id} /> {f.name}
                    </label>
                  ))}
                </div>
              </div>
              <SubmitButton pendingLabel="Création...">Créer le canal</SubmitButton>
            </form>
          </details>
        </div>

        <div className="card p-6 flex flex-col min-h-[420px]">
          {!active ? (
            <EmptyState icon="💭" title="Aucun canal" description="Crée ton premier canal à gauche." />
          ) : (
            <>
              <h2 className="text-sm font-semibold text-text-primary mb-4">{active.name}</h2>
              <form action={publishPost.bind(null, active.id)} className="mb-5 space-y-2">
                <textarea
                  name="body"
                  required
                  rows={2}
                  placeholder="Écrire une publication…"
                  className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
                <SubmitButton pendingLabel="Publication...">Publier</SubmitButton>
              </form>
              <div className="flex-1 space-y-4">
                {!posts || posts.length === 0 ? (
                  <EmptyState icon="✨" title="Pas encore de publication" />
                ) : (
                  posts.map((p) => {
                    const author = p.profiles as unknown as { full_name: string; avatar_color: string } | null;
                    return (
                      <div key={p.id} className="flex items-start gap-2.5">
                        <Avatar name={author?.full_name ?? "—"} color={author?.avatar_color} size="sm" />
                        <div>
                          <p className="text-sm">
                            <span className="font-medium text-text-primary">{author?.full_name}</span>{" "}
                            <span className="font-mono text-xs text-text-faint">{formatDateTime(p.created_at)}</span>
                          </p>
                          <p className="text-sm text-text-primary mt-0.5">{p.body}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
