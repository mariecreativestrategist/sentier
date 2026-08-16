import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { publishClientPost } from "./actions";

export default async function EspaceCommunautePage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  await requireProfile("learner");
  const { channel } = await searchParams;
  const supabase = await createClient();

  // RLS already restricts this to channels the learner can see (access_all
  // or their formation is in channel_formations) — see can_view_channel().
  const { data: channels } = await supabase.from("channels").select("*").order("created_at");
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

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <div className="card divide-y divide-border-soft">
          {!channels || channels.length === 0 ? (
            <EmptyState icon="💭" title="Aucun canal accessible" />
          ) : (
            channels.map((c) => (
              <Link
                key={c.id}
                href={`/espace/communaute?channel=${c.id}`}
                className={`block px-4 py-3 text-sm truncate ${active?.id === c.id ? "bg-primary-dim text-primary font-medium" : "text-text-primary hover:bg-bg-elevated-2"}`}
              >
                {c.name}
              </Link>
            ))
          )}
        </div>

        <div className="card p-6 flex flex-col min-h-[420px]">
          {!active ? (
            <EmptyState icon="💭" title="Aucun canal accessible" />
          ) : (
            <>
              <h2 className="text-sm font-semibold text-text-primary mb-4">{active.name}</h2>
              {active.post_permission === "all" ? (
                <form action={publishClientPost.bind(null, active.id)} className="mb-5 space-y-2">
                  <textarea
                    name="body"
                    required
                    rows={2}
                    placeholder="Écrire une publication…"
                    className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <SubmitButton pendingLabel="Publication...">Publier</SubmitButton>
                </form>
              ) : (
                <p className="text-sm text-text-faint mb-5">Seul le formateur peut publier dans ce canal.</p>
              )}
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
