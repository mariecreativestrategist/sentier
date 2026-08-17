import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { sendCoachMessage } from "./actions";

export default async function MessageriePage({
  searchParams,
}: {
  searchParams: Promise<{ learner?: string }>;
}) {
  await requireProfile("coach");
  const { learner: selectedLearnerId } = await searchParams;
  const supabase = await createClient();

  const [{ data: learners }, { data: conversations }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_color").eq("role", "learner").order("full_name"),
    supabase.from("conversations").select("id, learner_id"),
  ]);

  const conversationByLearner = new Map((conversations ?? []).map((c) => [c.learner_id, c.id]));
  const activeLearnerId = selectedLearnerId ?? learners?.[0]?.id;
  const activeLearner = learners?.find((l) => l.id === activeLearnerId);
  const activeConversationId = activeLearnerId ? conversationByLearner.get(activeLearnerId) : undefined;

  const { data: messages } = activeConversationId
    ? await supabase
        .from("messages")
        .select("*, profiles(full_name)")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <div>
      <h1 className="text-lg font-semibold text-text-primary mb-6">Messagerie</h1>

      <div className="card grid grid-cols-1 md:grid-cols-[260px_1fr] min-h-[480px]">
        <div className="border-b md:border-b-0 md:border-r border-border-soft divide-y divide-border-soft overflow-y-auto">
          {!learners || learners.length === 0 ? (
            <EmptyState icon="💬" title="Aucun apprenant" />
          ) : (
            learners.map((l) => (
              <Link
                key={l.id}
                href={`/admin/messagerie?learner=${l.id}`}
                className={`flex items-center gap-2.5 px-4 py-3 text-sm ${activeLearnerId === l.id ? "bg-primary-dim" : "hover:bg-bg-elevated-2"}`}
              >
                <Avatar name={l.full_name} color={l.avatar_color} size="sm" />
                <span className="font-medium text-text-primary truncate">{l.full_name}</span>
              </Link>
            ))
          )}
        </div>

        <div className="flex flex-col p-5 min-w-0">
          {!activeLearner ? (
            <EmptyState icon="💬" title="Choisis un apprenant" />
          ) : (
            <>
              <p className="text-sm font-semibold text-text-primary mb-4 pb-4 border-b border-border-soft">
                {activeLearner.full_name}
              </p>
              <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                {!messages || messages.length === 0 ? (
                  <EmptyState icon="✨" title="Pas encore de message" />
                ) : (
                  messages.map((m) => {
                    const authorName = (m.profiles as unknown as { full_name: string } | null)?.full_name ?? "—";
                    return (
                      <div key={m.id}>
                        <p className="text-xs text-text-faint">
                          {authorName} · {formatDateTime(m.created_at)}
                        </p>
                        <p className="text-sm text-text-primary mt-0.5">{m.body}</p>
                      </div>
                    );
                  })
                )}
              </div>
              <form action={sendCoachMessage.bind(null, activeLearner.id)} className="flex gap-2">
                <textarea
                  name="body"
                  required
                  rows={2}
                  placeholder="Écrire un message…"
                  className="flex-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
                <SubmitButton pendingLabel="Envoi...">Envoyer</SubmitButton>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
