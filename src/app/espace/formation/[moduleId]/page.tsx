import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DetailHeader } from "@/components/ui/detail-header";
import { Subtabs } from "@/components/ui/subtabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { FileChip } from "@/components/ui/file-chip";
import { videoEmbedSrc } from "@/lib/video";
import { markModuleDone, submitExercise, submitQuiz } from "./actions";

export default async function ModuleViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ moduleId: string }>;
  searchParams: Promise<{ tab?: string; chapter?: string }>;
}) {
  const profile = await requireProfile("learner");
  const { moduleId } = await params;
  const { tab, chapter } = await searchParams;
  const activeTab = tab ?? "lecons";
  const supabase = await createClient();

  const { data: mod } = await supabase.from("modules").select("*, formations(name)").eq("id", moduleId).single();
  if (!mod) notFound();
  const formationName = (mod.formations as unknown as { name: string } | null)?.name ?? "";

  const [{ data: chapters }, { data: exercises }, { data: questions }] = await Promise.all([
    supabase.from("chapters").select("*").eq("module_id", moduleId).order("position"),
    supabase.from("exercises").select("*").eq("module_id", moduleId).order("position"),
    supabase.from("quiz_questions").select("*, quiz_options(*)").eq("module_id", moduleId).order("position"),
  ]);

  const basePath = `/espace/formation/${moduleId}`;

  return (
    <div>
      <Link href="/espace/formation" className="text-sm text-text-muted hover:text-primary mb-4 inline-block">
        ← Retour à ma formation
      </Link>

      <DetailHeader icon="🧩" title={mod.name} subtitle={formationName} />

      <Subtabs
        basePath={basePath}
        active={activeTab}
        tabs={[
          { key: "lecons", label: "Leçons" },
          { key: "exercices", label: "Exercices" },
          { key: "quiz", label: "Quiz" },
        ]}
      />

      {activeTab === "lecons" && (
        <LeconsTab moduleId={moduleId} chapters={chapters ?? []} selectedChapterId={chapter} basePath={basePath} />
      )}
      {activeTab === "exercices" && (
        <ExercicesTab moduleId={moduleId} exercises={exercises ?? []} learnerId={profile.id} />
      )}
      {activeTab === "quiz" && <QuizTab moduleId={moduleId} questions={questions ?? []} learnerId={profile.id} />}
    </div>
  );
}

type Chapter = { id: string; title: string; video_url: string; body_html: string };

async function LeconsTab({
  moduleId,
  chapters,
  selectedChapterId,
  basePath,
}: {
  moduleId: string;
  chapters: Chapter[];
  selectedChapterId?: string;
  basePath: string;
}) {
  const supabase = await createClient();
  const selected = chapters.find((c) => c.id === selectedChapterId) ?? chapters[0];

  let files: { filename: string; url: string | null }[] = [];
  if (selected) {
    const { data: attachments } = await supabase
      .from("attachments")
      .select("filename, storage_path")
      .eq("owner_type", "chapter")
      .eq("owner_id", selected.id);
    files = await Promise.all(
      (attachments ?? []).map(async (a) => {
        const { data } = await supabase.storage.from("files").createSignedUrl(a.storage_path, 3600);
        return { filename: a.filename, url: data?.signedUrl ?? null };
      })
    );
  }

  return (
    <div className="card flex min-h-[420px]">
      <div className="w-[250px] border-r border-border-soft shrink-0 divide-y divide-border-soft">
        {chapters.map((c, i) => (
          <Link
            key={c.id}
            href={`${basePath}?tab=lecons&chapter=${c.id}`}
            className={`flex items-center gap-2.5 px-4 py-3 text-sm ${selected?.id === c.id ? "bg-primary-dim text-primary font-medium" : "text-text-primary hover:bg-bg-elevated-2"}`}
          >
            <span className="text-xs text-text-faint w-4">{i + 1}</span>
            <span className="truncate">{c.title}</span>
          </Link>
        ))}
      </div>

      <div className="flex-1 p-6 min-w-0">
        {!selected ? (
          <EmptyState icon="📄" title="Pas encore de contenu" />
        ) : (
          <>
            <h2 className="text-base font-semibold text-text-primary mb-4">{selected.title}</h2>
            {selected.video_url && videoEmbedSrc(selected.video_url) && (
              <div className="aspect-video rounded-[var(--radius-sm)] overflow-hidden bg-black mb-4">
                <iframe src={videoEmbedSrc(selected.video_url)!} className="w-full h-full" allowFullScreen />
              </div>
            )}
            <div
              className="text-sm text-text-primary rte-editable"
              dangerouslySetInnerHTML={{ __html: selected.body_html }}
            />
            {files.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border-soft flex flex-wrap gap-2">
                {files.map((f, i) =>
                  f.url ? (
                    <a key={i} href={f.url} target="_blank" rel="noreferrer">
                      <FileChip filename={f.filename} />
                    </a>
                  ) : (
                    <FileChip key={i} filename={f.filename} />
                  )
                )}
              </div>
            )}
          </>
        )}

        <form action={markModuleDone.bind(null, moduleId)} className="mt-6 pt-5 border-t border-border-soft">
          <SubmitButton pendingLabel="...">Marquer ce module comme terminé</SubmitButton>
        </form>
      </div>
    </div>
  );
}

type Exercise = { id: string; title: string; description_html: string };

async function ExercicesTab({
  moduleId,
  exercises,
  learnerId,
}: {
  moduleId: string;
  exercises: Exercise[];
  learnerId: string;
}) {
  const supabase = await createClient();
  const exerciseIds = exercises.map((e) => e.id);
  const { data: mySubmissions } = exerciseIds.length
    ? await supabase.from("exercise_submissions").select("*").in("exercise_id", exerciseIds).eq("learner_id", learnerId)
    : { data: [] };

  return (
    <div className="space-y-5">
      {exercises.length === 0 && (
        <div className="card">
          <EmptyState icon="📝" title="Aucun exercice" />
        </div>
      )}
      {exercises.map((ex) => {
        const mine = (mySubmissions ?? []).find((s) => s.exercise_id === ex.id);
        return (
          <div key={ex.id} className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary">{ex.title}</h3>
            <div
              className="text-sm text-text-muted mt-1.5 rte-editable"
              dangerouslySetInnerHTML={{ __html: ex.description_html }}
            />
            <div className="mt-4 pt-4 border-t border-border-soft">
              {mine ? (
                <div className="space-y-2">
                  <div className="rounded-[var(--radius-sm)] bg-bg-elevated-2 p-3 text-sm text-text-primary whitespace-pre-wrap">
                    {mine.content}
                  </div>
                  <StatusBadge
                    label={mine.status === "corrige" ? `Corrigé${mine.note ? ` · ${mine.note}` : ""}` : "En attente de correction"}
                    tone={mine.status === "corrige" ? "success" : "warning"}
                  />
                  {mine.status === "corrige" && mine.comment && (
                    <p className="text-sm text-text-muted mt-2">
                      <span className="font-medium text-text-primary">Commentaire du formateur : </span>
                      {mine.comment}
                    </p>
                  )}
                </div>
              ) : (
                <form action={submitExercise.bind(null, ex.id, moduleId)} className="space-y-2">
                  <textarea
                    name="content"
                    required
                    rows={4}
                    placeholder="Ta réponse…"
                    className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <SubmitButton pendingLabel="Envoi...">Envoyer ma remise</SubmitButton>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type QuizOption = { id: string; text: string; is_correct: boolean; position: number };
type QuizQuestion = { id: string; text: string; quiz_options: QuizOption[] };

async function QuizTab({
  moduleId,
  questions,
  learnerId,
}: {
  moduleId: string;
  questions: QuizQuestion[];
  learnerId: string;
}) {
  const supabase = await createClient();
  const { data: myAttempt } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("module_id", moduleId)
    .eq("learner_id", learnerId)
    .maybeSingle();

  if (questions.length === 0) {
    return (
      <div className="card">
        <EmptyState icon="❓" title="Aucun quiz pour ce module" />
      </div>
    );
  }

  if (myAttempt) {
    return (
      <div className="space-y-4">
        <div className="card p-5 bg-success-dim">
          <p className="text-sm font-semibold text-success">
            Tu as obtenu {myAttempt.score}/{myAttempt.total} à ce quiz.
          </p>
        </div>
        {questions.map((q, qi) => (
          <div key={q.id} className="card p-5">
            <p className="text-sm font-semibold text-text-primary mb-3">
              {qi + 1}. {q.text}
            </p>
            <ul className="space-y-1.5">
              {q.quiz_options
                .sort((a, b) => a.position - b.position)
                .map((o) => (
                  <li
                    key={o.id}
                    className={`text-sm rounded-[var(--radius-sm)] px-3 py-1.5 ${o.is_correct ? "bg-success-dim text-success font-medium" : "bg-bg-elevated-2 text-text-muted"}`}
                  >
                    {o.is_correct && "✓ "}
                    {o.text}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <form action={submitQuiz.bind(null, moduleId)} className="space-y-4">
      {questions.map((q, qi) => (
        <div key={q.id} className="card p-5">
          <p className="text-sm font-semibold text-text-primary mb-3">
            {qi + 1}. {q.text}
          </p>
          <div className="space-y-1.5">
            {q.quiz_options
              .sort((a, b) => a.position - b.position)
              .map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-2.5 text-sm rounded-[var(--radius-sm)] px-3 py-2 border border-border-soft hover:bg-bg-elevated-2 cursor-pointer"
                >
                  <input type="radio" name={`answer_${q.id}`} value={o.id} required className="accent-[var(--primary)]" />
                  {o.text}
                </label>
              ))}
          </div>
        </div>
      ))}
      <SubmitButton pendingLabel="Envoi...">Valider mes réponses</SubmitButton>
    </form>
  );
}
