import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { sendLearnerMessage } from "./actions";

export default async function EspaceMessageriePage() {
  const profile = await requireProfile("learner");
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("learner_id", profile.id)
    .maybeSingle();

  const { data: messages } = conversation
    ? await supabase
        .from("messages")
        .select("*, profiles(full_name)")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <div>
      <h1 className="text-lg font-semibold text-text-primary mb-6">Messagerie</h1>

      <div className="card p-6 flex flex-col min-h-[420px]">
        <div className="flex-1 space-y-3 mb-4">
          {!messages || messages.length === 0 ? (
            <EmptyState icon="💬" title="Écris à ton formateur" description="Pose une question, partage un point bloquant — tu recevras une réponse par ici." />
          ) : (
            messages.map((m) => {
              const authorName = (m.profiles as unknown as { full_name: string } | null)?.full_name ?? "—";
              const isMe = authorName === profile.full_name;
              return (
                <div key={m.id} className={isMe ? "text-right" : ""}>
                  <p className="text-xs text-text-faint">
                    {authorName} · {formatDateTime(m.created_at)}
                  </p>
                  <p className="text-sm text-text-primary mt-0.5">{m.body}</p>
                </div>
              );
            })
          )}
        </div>
        <form action={sendLearnerMessage} className="flex gap-2">
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Écrire un message…"
            className="flex-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
          />
          <SubmitButton pendingLabel="Envoi...">Envoyer</SubmitButton>
        </form>
      </div>
    </div>
  );
}
