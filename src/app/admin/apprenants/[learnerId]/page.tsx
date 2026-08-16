import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DetailHeader } from "@/components/ui/detail-header";
import { Subtabs } from "@/components/ui/subtabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { JourneyTrail } from "@/components/ui/journey-trail";
import { deriveModuleWaypoints } from "@/lib/module-state";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { FileChip } from "@/components/ui/file-chip";
import { videoEmbedSrc } from "@/lib/video";
import { formatDate, formatDateTime, docTypeLabel } from "@/lib/format";
import { addNote, saveSessionDetail, submitApprenantDocForm } from "./actions";

export default async function ApprenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ learnerId: string }>;
  searchParams: Promise<{ tab?: string; session?: string }>;
}) {
  await requireProfile("coach");
  const { learnerId } = await params;
  const { tab, session } = await searchParams;
  const activeTab = tab ?? "sessions";
  const supabase = await createClient();

  const { data: learner } = await supabase.from("profiles").select("*").eq("id", learnerId).single();
  if (!learner) notFound();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, progress, formation_id, formations(name)")
    .eq("learner_id", learnerId)
    .maybeSingle();

  const formationName = (enrollment?.formations as unknown as { name: string } | null)?.name ?? "Aucune formation";

  const [{ data: sessions }, { data: notes }] = await Promise.all([
    supabase.from("coaching_sessions").select("*").eq("learner_id", learnerId).order("scheduled_at", { ascending: false }),
    supabase.from("coach_notes").select("*").eq("learner_id", learnerId).order("created_at", { ascending: false }),
  ]);

  const basePath = `/admin/apprenants/${learnerId}`;
  const nextSession = (sessions ?? []).find((s) => s.status === "a_venir");

  let waypoints: { label: string; state: "done" | "current" | "todo" }[] = [];
  if (enrollment) {
    const { data: modules } = await supabase
      .from("modules")
      .select("id, name, position")
      .eq("formation_id", enrollment.formation_id)
      .order("position");
    const { data: progress } = await supabase
      .from("module_progress")
      .select("module_id")
      .eq("enrollment_id", enrollment.id)
      .eq("state", "done");
    waypoints = deriveModuleWaypoints(modules ?? [], new Set((progress ?? []).map((p) => p.module_id)));
  }

  return (
    <div>
      <Link href="/admin/apprenants" className="text-sm text-text-muted hover:text-primary mb-4 inline-block">
        ← Apprenants
      </Link>

      <DetailHeader
        icon={<Avatar name={learner.full_name} color={learner.avatar_color} size="lg" />}
        title={learner.full_name}
        subtitle={`${learner.email} · ${formationName}`}
        stats={[
          { label: "Progression", value: `${enrollment?.progress ?? 0}%` },
          { label: "Sessions", value: sessions?.length ?? 0 },
          { label: "Prochaine session", value: nextSession ? formatDate(nextSession.scheduled_at) : "—" },
        ]}
        actions={
          <Link
            href="/admin/coaching?tab=creneaux"
            className="rounded-[var(--radius-sm)] border border-border text-text-primary text-sm font-medium px-3.5 py-2 hover:bg-bg-elevated-2"
          >
            Planifier une session
          </Link>
        }
      />

      {waypoints.length > 0 && (
        <div className="card p-6 mb-6">
          <JourneyTrail waypoints={waypoints} />
        </div>
      )}

      <Subtabs
        basePath={basePath}
        active={activeTab}
        tabs={[
          { key: "sessions", label: "Sessions" },
          { key: "notes", label: "Notes de suivi" },
          { key: "corrections", label: "Corrections" },
          { key: "documents", label: "Documents" },
          { key: "certificat", label: "Certificat" },
        ]}
      />

      {activeTab === "sessions" && (
        <SessionsTab learnerId={learnerId} sessions={sessions ?? []} selectedId={session} basePath={basePath} />
      )}
      {activeTab === "notes" && <NotesTab learnerId={learnerId} notes={notes ?? []} />}
      {activeTab === "corrections" && <CorrectionsTab learnerId={learnerId} />}
      {activeTab === "documents" && (
        <DocumentsTab learnerId={learnerId} formationId={enrollment?.formation_id ?? null} />
      )}
      {activeTab === "certificat" && (
        <CertificatTab progress={enrollment?.progress ?? 0} formationName={formationName} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type Session = {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  recording_url: string | null;
  transcript: string | null;
};

function SessionsTab({
  learnerId,
  sessions,
  selectedId,
  basePath,
}: {
  learnerId: string;
  sessions: Session[];
  selectedId?: string;
  basePath: string;
}) {
  const selected = sessions.find((s) => s.id === selectedId && s.status === "terminee");

  return (
    <div className="card divide-y divide-border-soft">
      {sessions.length === 0 && <EmptyState icon="🗓️" title="Aucune session" />}
      {sessions.map((s) => (
        <div key={s.id}>
          {s.status === "terminee" ? (
            <Link
              href={`${basePath}?tab=sessions&session=${s.id}`}
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
            <div className="px-5 pb-5">
              <form action={saveSessionDetail.bind(null, learnerId, s.id)} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Lien d&apos;enregistrement</label>
                  <input
                    name="recordingUrl"
                    defaultValue={s.recording_url ?? ""}
                    placeholder="https://…"
                    className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  {s.recording_url && videoEmbedSrc(s.recording_url) && (
                    <div className="aspect-video mt-2 rounded-[var(--radius-sm)] overflow-hidden bg-black max-w-md">
                      <iframe src={videoEmbedSrc(s.recording_url)!} className="w-full h-full" allowFullScreen />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Retranscription</label>
                  <textarea
                    name="transcript"
                    defaultValue={s.transcript ?? ""}
                    rows={4}
                    className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                </div>
                <SubmitButton pendingLabel="Enregistrement...">Enregistrer</SubmitButton>
              </form>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type Note = { id: string; body: string; created_at: string };

function NotesTab({ learnerId, notes }: { learnerId: string; notes: Note[] }) {
  return (
    <div className="card p-5">
      <form action={addNote.bind(null, learnerId)} className="mb-5 space-y-2">
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Ajouter une note après cet échange…"
          className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
        <SubmitButton pendingLabel="Ajout...">Ajouter la note</SubmitButton>
      </form>
      {notes.length === 0 ? (
        <EmptyState icon="🗒️" title="Aucune note" />
      ) : (
        <ul className="space-y-3 pt-4 border-t border-border-soft">
          {notes.map((n) => (
            <li key={n.id}>
              <p className="font-mono text-xs text-text-faint">{formatDate(n.created_at)}</p>
              <p className="text-sm text-text-primary mt-0.5 whitespace-pre-wrap">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function CorrectionsTab({ learnerId }: { learnerId: string }) {
  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("exercise_submissions")
    .select("*, exercises(title, module_id, modules(name, formation_id, formations(name)))")
    .eq("learner_id", learnerId)
    .order("submitted_at", { ascending: false });

  return (
    <div className="card divide-y divide-border-soft">
      {!submissions || submissions.length === 0 ? (
        <EmptyState icon="✏️" title="Aucune remise" />
      ) : (
        submissions.map((s) => {
          const exercise = s.exercises as unknown as {
            title: string;
            modules: { name: string; formation_id: string; formations: { name: string } | null } | null;
          } | null;
          const mod = exercise?.modules;
          return (
            <Link
              key={s.id}
              href={mod ? `/admin/formations/${mod.formation_id}/modules/${(s.exercises as unknown as { module_id: string }).module_id}?tab=exercices` : "#"}
              className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-bg-elevated-2"
            >
              <div>
                <p className="text-sm text-text-primary">{exercise?.title}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {mod?.formations?.name} · {mod?.name}
                </p>
              </div>
              <StatusBadge
                label={s.status === "corrige" ? "Corrigé" : "À corriger"}
                tone={s.status === "corrige" ? "success" : "warning"}
              />
            </Link>
          );
        })
      )}
    </div>
  );
}

async function DocumentsTab({ learnerId, formationId }: { learnerId: string; formationId: string | null }) {
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false });

  return (
    <div className="card overflow-hidden">
      {!documents || documents.length === 0 ? (
        <EmptyState icon="🗂️" title="Aucun document" />
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-b border-border-soft last:border-0">
                <td className="px-5 py-3 font-medium text-text-primary">{d.title}</td>
                <td className="px-5 py-3">
                  <StatusBadge label={docTypeLabel[d.type]} tone="neutral" />
                </td>
                <td className="px-5 py-3 font-mono text-xs text-text-muted">{formatDate(d.created_at)}</td>
                <td className="px-5 py-3">{d.filename && <FileChip filename={d.filename} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form
        action={submitApprenantDocForm.bind(null, learnerId, formationId)}
        className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-border-soft"
      >
        <input
          name="title"
          required
          placeholder="Titre du document"
          className="flex-1 min-w-[140px] rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
        <select name="type" className="rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm">
          <option value="facture">Facture</option>
          <option value="contrat">Contrat</option>
          <option value="autre">Autre</option>
        </select>
        <input type="file" name="file" className="text-xs" />
        <SubmitButton pendingLabel="Ajout...">+ Ajouter</SubmitButton>
      </form>
    </div>
  );
}

function CertificatTab({ progress, formationName }: { progress: number; formationName: string }) {
  if (progress >= 100) {
    return (
      <div className="card p-8 text-center">
        <p className="text-3xl mb-2">🎓</p>
        <p className="text-sm font-semibold text-text-primary">Certificat débloqué</p>
        <p className="text-sm text-text-muted mt-1">{formationName}</p>
        <button
          type="button"
          disabled
          className="mt-4 rounded-[var(--radius-sm)] bg-primary text-white text-sm font-medium px-4 py-2 opacity-60 cursor-not-allowed"
          title="Génération PDF réelle prévue en phase 2"
        >
          Télécharger le certificat (PDF)
        </button>
      </div>
    );
  }
  return (
    <div className="card">
      <EmptyState icon="🔒" title="Certificat verrouillé" description={`${progress}% de la formation complétée — 100% requis.`} />
    </div>
  );
}
