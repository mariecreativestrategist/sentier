import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Subtabs } from "@/components/ui/subtabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { videoEmbedSrc } from "@/lib/video";
import { formatDate, formatDateTime, formatTimeRange } from "@/lib/format";
import { bookSlot } from "./actions";
import Link from "next/link";

export default async function EspaceCoachingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; session?: string }>;
}) {
  const profile = await requireProfile("learner");
  const { tab, session } = await searchParams;
  const activeTab = tab ?? "sessions";
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("formation_id")
    .eq("learner_id", profile.id)
    .maybeSingle();

  return (
    <div>
      <h1 className="text-lg font-semibold text-text-primary mb-6">Coaching</h1>

      <Subtabs
        basePath="/espace/coaching"
        active={activeTab}
        tabs={[
          { key: "sessions", label: "Mes sessions" },
          { key: "lives", label: "Lives de groupe" },
          { key: "creneaux", label: "Réserver un créneau" },
        ]}
      />

      {activeTab === "sessions" && <SessionsTab learnerId={profile.id} selectedId={session} />}
      {activeTab === "lives" && <LivesTab formationId={enrollment?.formation_id ?? null} />}
      {activeTab === "creneaux" && <CreneauxTab />}
    </div>
  );

  async function SessionsTab({ learnerId, selectedId }: { learnerId: string; selectedId?: string }) {
    const { data: sessions } = await supabase
      .from("coaching_sessions")
      .select("*")
      .eq("learner_id", learnerId)
      .order("scheduled_at", { ascending: false });

    const selected = (sessions ?? []).find((s) => s.id === selectedId && s.status === "terminee");

    return (
      <div className="card divide-y divide-border-soft">
        {!sessions || sessions.length === 0 ? (
          <EmptyState icon="🗓️" title="Aucune session" />
        ) : (
          sessions.map((s) => (
            <div key={s.id}>
              {s.status === "terminee" ? (
                <Link
                  href={`/espace/coaching?tab=sessions&session=${s.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-bg-elevated-2"
                >
                  <div>
                    <p className="text-sm text-text-primary">{s.title}</p>
                    <p className="font-mono text-xs text-text-muted mt-0.5">{formatDateTime(s.scheduled_at)}</p>
                  </div>
                  <StatusBadge label="Terminée" tone="neutral" />
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm text-text-primary">{s.title}</p>
                    <p className="font-mono text-xs text-text-muted mt-0.5">{formatDateTime(s.scheduled_at)}</p>
                  </div>
                  <StatusBadge label="À venir" tone="primary" />
                </div>
              )}
              {selected?.id === s.id && (
                <div className="px-5 pb-5 space-y-3">
                  {s.recording_url ? (
                    videoEmbedSrc(s.recording_url) ? (
                      <div className="aspect-video rounded-[var(--radius-sm)] overflow-hidden bg-black max-w-md">
                        <iframe src={videoEmbedSrc(s.recording_url)!} className="w-full h-full" allowFullScreen />
                      </div>
                    ) : (
                      <a href={s.recording_url} target="_blank" rel="noreferrer" className="text-sm text-primary">
                        Voir l&apos;enregistrement →
                      </a>
                    )
                  ) : (
                    <p className="text-sm text-text-faint">Pas encore d&apos;enregistrement.</p>
                  )}
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-1">Retranscription</p>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">
                      {s.transcript || "Pas encore de retranscription."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  async function LivesTab({ formationId }: { formationId: string | null }) {
    if (!formationId) {
      return (
        <div className="card">
          <EmptyState icon="🎥" title="Aucune formation associée" />
        </div>
      );
    }
    const { data: lives } = await supabase
      .from("group_sessions")
      .select("*")
      .eq("formation_id", formationId)
      .order("starts_at");

    return (
      <div className="card divide-y divide-border-soft">
        {!lives || lives.length === 0 ? (
          <EmptyState icon="🎥" title="Aucun live planifié" />
        ) : (
          lives.map((l) => (
            <div key={l.id} className="px-5 py-4">
              <p className="text-sm font-medium text-text-primary">{l.title}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {formatDateTime(l.starts_at)} · {l.duration_minutes} min
                {l.meeting_link ? " · lien envoyé avant la session" : ""}
              </p>
            </div>
          ))
        )}
      </div>
    );
  }

  async function CreneauxTab() {
    const { data: slots } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("is_booked", false)
      .gte("start_at", now)
      .order("start_at");

    return (
      <div className="card divide-y divide-border-soft">
        {!slots || slots.length === 0 ? (
          <EmptyState icon="🕒" title="Aucun créneau ouvert pour l'instant" />
        ) : (
          slots.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-sm text-text-primary">{formatDate(s.start_at)}</p>
                <p className="font-mono text-xs text-text-muted">{formatTimeRange(s.start_at, s.end_at)}</p>
              </div>
              <form action={bookSlot.bind(null, s.id)}>
                <input type="hidden" name="title" value="Session réservée" />
                <SubmitButton pendingLabel="Réservation...">Réserver</SubmitButton>
              </form>
            </div>
          ))
        )}
      </div>
    );
  }
}
