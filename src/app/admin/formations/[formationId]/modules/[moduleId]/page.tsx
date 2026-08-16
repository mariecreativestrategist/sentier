import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DetailHeader } from "@/components/ui/detail-header";
import { Subtabs } from "@/components/ui/subtabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { FileChip } from "@/components/ui/file-chip";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { videoEmbedSrc } from "@/lib/video";
import {
  addChapter,
  addChapterFile,
  addExercise,
  addQuizQuestion,
  deleteChapter,
  deleteQuizQuestion,
  removeAttachment,
  saveCorrection,
  updateChapter,
} from "./actions";

export default async function ModuleBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ formationId: string; moduleId: string }>;
  searchParams: Promise<{ tab?: string; chapter?: string }>;
}) {
  await requireProfile("coach");
  const { formationId, moduleId } = await params;
  const { tab, chapter } = await searchParams;
  const activeTab = tab ?? "lecons";
  const supabase = await createClient();

  const [{ data: mod }, { data: formation }] = await Promise.all([
    supabase.from("modules").select("*").eq("id", moduleId).single(),
    supabase.from("formations").select("id, name").eq("id", formationId).single(),
  ]);
  if (!mod || !formation) notFound();

  const [{ data: chapters }, { data: exercises }, { data: questions }] = await Promise.all([
    supabase.from("chapters").select("*").eq("module_id", moduleId).order("position"),
    supabase.from("exercises").select("*").eq("module_id", moduleId).order("position"),
    supabase.from("quiz_questions").select("*, quiz_options(*)").eq("module_id", moduleId).order("position"),
  ]);

  const modulePathBase = `/admin/formations/${formationId}/modules/${moduleId}`;

  return (
    <div>
      <Link href={`/admin/formations/${formationId}?tab=modules`} className="text-sm text-text-muted hover:text-primary mb-4 inline-block">
        ← {formation.name}
      </Link>

      <DetailHeader
        icon="🧩"
        title={mod.name}
        subtitle={formation.name}
        stats={[
          { label: "Chapitres", value: chapters?.length ?? 0 },
          { label: "Exercices", value: exercises?.length ?? 0 },
          { label: "Questions quiz", value: questions?.length ?? 0 },
        ]}
      />

      <Subtabs
        basePath={modulePathBase}
        active={activeTab}
        tabs={[
          { key: "lecons", label: "Leçons" },
          { key: "exercices", label: "Exercices" },
          { key: "quiz", label: "Quiz" },
        ]}
      />

      {activeTab === "lecons" && (
        <LeconsTab
          formationId={formationId}
          moduleId={moduleId}
          chapters={chapters ?? []}
          selectedChapterId={chapter}
          modulePathBase={modulePathBase}
        />
      )}
      {activeTab === "exercices" && (
        <ExercicesTab formationId={formationId} moduleId={moduleId} exercises={exercises ?? []} />
      )}
      {activeTab === "quiz" && (
        <QuizTab formationId={formationId} moduleId={moduleId} questions={questions ?? []} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type Chapter = {
  id: string;
  title: string;
  video_url: string;
  body_html: string;
};

async function LeconsTab({
  formationId,
  moduleId,
  chapters,
  selectedChapterId,
  modulePathBase,
}: {
  formationId: string;
  moduleId: string;
  chapters: Chapter[];
  selectedChapterId?: string;
  modulePathBase: string;
}) {
  const supabase = await createClient();
  const selected = chapters.find((c) => c.id === selectedChapterId) ?? chapters[0];
  const attachments = selected
    ? (await supabase.from("attachments").select("*").eq("owner_type", "chapter").eq("owner_id", selected.id)).data
    : [];

  return (
    <div className="card flex min-h-[420px]">
      <div className="w-[250px] border-r border-border-soft shrink-0">
        <div className="divide-y divide-border-soft">
          {chapters.map((c, i) => (
            <Link
              key={c.id}
              href={`${modulePathBase}?tab=lecons&chapter=${c.id}`}
              className={`flex items-center gap-2.5 px-4 py-3 text-sm ${selected?.id === c.id ? "bg-primary-dim text-primary font-medium" : "text-text-primary hover:bg-bg-elevated-2"}`}
            >
              <span className="text-xs text-text-faint w-4">{i + 1}</span>
              <span className="truncate">{c.title}</span>
            </Link>
          ))}
        </div>
        <form action={addChapter.bind(null, formationId, moduleId)} className="p-3 border-t border-border-soft">
          <input type="hidden" name="title" value="Nouveau chapitre" />
          <SubmitButton variant="ghost" className="w-full" pendingLabel="Ajout...">
            + Ajouter un chapitre
          </SubmitButton>
        </form>
      </div>

      <div className="flex-1 p-6 min-w-0">
        {!selected ? (
          <EmptyState icon="📄" title="Aucun chapitre" description="Ajoute un premier chapitre à gauche." />
        ) : (
          <form action={updateChapter.bind(null, formationId, moduleId, selected.id)} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <input
                name="title"
                defaultValue={selected.title}
                className="flex-1 text-base font-semibold text-text-primary border-none outline-none bg-transparent"
              />
              <SubmitButton variant="ghost" pendingLabel="...">Enregistrer</SubmitButton>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Vidéo (lien YouTube ou Vimeo)</label>
              <input
                name="videoUrl"
                defaultValue={selected.video_url}
                placeholder="https://youtube.com/watch?v=…"
                className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
              {selected.video_url && videoEmbedSrc(selected.video_url) && (
                <div className="aspect-video mt-2 rounded-[var(--radius-sm)] overflow-hidden bg-black">
                  <iframe src={videoEmbedSrc(selected.video_url)!} className="w-full h-full" allowFullScreen />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Contenu</label>
              <RichTextEditor name="body" defaultValue={selected.body_html} />
            </div>
          </form>
        )}

        {selected && (
          <div className="mt-6 pt-5 border-t border-border-soft">
            <p className="text-xs font-medium text-text-muted mb-2">Fichiers joints</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(attachments ?? []).map((a) => (
                <form key={a.id} action={removeAttachment.bind(null, formationId, moduleId, a.id)}>
                  <button type="submit" className="block" title="Retirer ce fichier">
                    <FileChip filename={a.filename} />
                  </button>
                </form>
              ))}
            </div>
            <form action={addChapterFile.bind(null, formationId, moduleId, selected.id)} className="flex items-center gap-2">
              <input type="file" name="file" required className="text-xs" />
              <SubmitButton variant="ghost" pendingLabel="Envoi...">Ajouter</SubmitButton>
            </form>
          </div>
        )}

        {selected && (
          <form action={deleteChapter.bind(null, formationId, moduleId, selected.id)} className="mt-6">
            <SubmitButton variant="danger" pendingLabel="Suppression...">Supprimer ce chapitre</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

type Exercise = { id: string; title: string; description_html: string };

async function ExercicesTab({
  formationId,
  moduleId,
  exercises,
}: {
  formationId: string;
  moduleId: string;
  exercises: Exercise[];
}) {
  const supabase = await createClient();
  const exerciseIds = exercises.map((e) => e.id);
  const [{ data: submissions }, { data: attachments }] = await Promise.all([
    exerciseIds.length
      ? supabase
          .from("exercise_submissions")
          .select("*, profiles(full_name, avatar_color)")
          .in("exercise_id", exerciseIds)
      : Promise.resolve({ data: [] }),
    exerciseIds.length
      ? supabase.from("attachments").select("*").eq("owner_type", "exercise").in("owner_id", exerciseIds)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-5">
      {exercises.length === 0 && (
        <div className="card">
          <EmptyState icon="📝" title="Aucun exercice" />
        </div>
      )}

      {exercises.map((ex) => {
        const subs = (submissions ?? []).filter((s) => s.exercise_id === ex.id);
        const file = (attachments ?? []).find((a) => a.owner_id === ex.id);
        return (
          <div key={ex.id} className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary">{ex.title}</h3>
            <div
              className="text-sm text-text-muted mt-1.5 rte-editable"
              dangerouslySetInnerHTML={{ __html: ex.description_html }}
            />
            {file && (
              <div className="mt-2">
                <FileChip filename={file.filename} />
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border-soft space-y-2">
              {subs.length === 0 ? (
                <p className="text-xs text-text-faint">Aucune remise pour l&apos;instant.</p>
              ) : (
                subs.map((s) => {
                  const learner = s.profiles as unknown as { full_name: string; avatar_color: string } | null;
                  return (
                    <details key={s.id} className="rounded-[var(--radius-sm)] border border-border-soft">
                      <summary className="flex items-center gap-2.5 px-3 py-2 cursor-pointer list-none">
                        <Avatar name={learner?.full_name ?? "—"} color={learner?.avatar_color} size="sm" />
                        <span className="text-sm text-text-primary flex-1">{learner?.full_name}</span>
                        <StatusBadge
                          label={s.status === "corrige" ? `Corrigé${s.note ? ` · ${s.note}` : ""}` : "À corriger"}
                          tone={s.status === "corrige" ? "success" : "warning"}
                        />
                      </summary>
                      <div className="px-3 pb-3 pt-1 space-y-3">
                        <div className="rounded-[var(--radius-sm)] bg-bg-elevated-2 p-3 text-sm text-text-primary whitespace-pre-wrap">
                          {s.content}
                        </div>
                        <form action={saveCorrection.bind(null, formationId, moduleId, s.id)} className="space-y-2">
                          <textarea
                            name="comment"
                            defaultValue={s.comment ?? ""}
                            placeholder="Commentaire"
                            rows={2}
                            className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                          />
                          <input
                            name="note"
                            defaultValue={s.note ?? ""}
                            placeholder="Note (ex. 8/10)"
                            className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                          />
                          <SubmitButton pendingLabel="Enregistrement...">Enregistrer la correction</SubmitButton>
                        </form>
                      </div>
                    </details>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      <details className="card p-5">
        <summary className="cursor-pointer text-sm font-medium text-primary list-none">+ Ajouter un exercice</summary>
        <form action={addExercise.bind(null, formationId, moduleId)} className="space-y-3 mt-4">
          <input
            name="title"
            required
            placeholder="Titre de l'exercice"
            className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
          />
          <RichTextEditor name="description" />
          <input type="file" name="file" className="text-xs" />
          <SubmitButton pendingLabel="Ajout...">Ajouter l&apos;exercice</SubmitButton>
        </form>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------

type QuizOption = { id: string; text: string; is_correct: boolean; position: number };
type QuizQuestion = { id: string; text: string; quiz_options: QuizOption[] };

async function QuizTab({
  formationId,
  moduleId,
  questions,
}: {
  formationId: string;
  moduleId: string;
  questions: QuizQuestion[];
}) {
  const supabase = await createClient();
  const { data: results } = await supabase
    .from("quiz_attempts")
    .select("*, profiles(full_name, avatar_color)")
    .eq("module_id", moduleId);

  return (
    <div className="space-y-4">
      {questions.length === 0 && (
        <div className="card">
          <EmptyState icon="❓" title="Aucune question" />
        </div>
      )}

      {questions.map((q, qi) => (
        <div key={q.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-text-primary">
              {qi + 1}. {q.text}
            </p>
            <form action={deleteQuizQuestion.bind(null, formationId, moduleId, q.id)}>
              <SubmitButton variant="ghost" pendingLabel="...">Supprimer</SubmitButton>
            </form>
          </div>
          <ul className="mt-3 space-y-1.5">
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

      <details className="card p-5">
        <summary className="cursor-pointer text-sm font-medium text-primary list-none">+ Ajouter une question</summary>
        <form action={addQuizQuestion.bind(null, formationId, moduleId)} className="space-y-3 mt-4">
          <input
            name="text"
            required
            placeholder="Intitulé de la question"
            className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
          />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" value={i} required={i === 0} className="accent-[var(--primary)]" />
              <input
                name="option"
                placeholder={`Réponse ${i + 1}${i < 2 ? " (obligatoire)" : " (facultatif)"}`}
                className="flex-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
          ))}
          <p className="text-xs text-text-faint">Coche la bonne réponse. Laisse vide les champs non utilisés.</p>
          <SubmitButton pendingLabel="Ajout...">Ajouter la question</SubmitButton>
        </form>
      </details>

      {results && results.length > 0 && (
        <div className="card overflow-hidden">
          <p className="px-5 py-3 text-sm font-semibold text-text-primary border-b border-border-soft">
            Résultats des apprenants
          </p>
          <table className="w-full text-sm">
            <tbody>
              {results.map((r) => {
                const learner = r.profiles as unknown as { full_name: string; avatar_color: string } | null;
                return (
                  <tr key={r.id} className="border-b border-border-soft last:border-0">
                    <td className="px-5 py-3 flex items-center gap-2.5">
                      <Avatar name={learner?.full_name ?? "—"} color={learner?.avatar_color} size="sm" />
                      {learner?.full_name}
                    </td>
                    <td className="px-5 py-3 font-mono">
                      {r.score}/{r.total}
                    </td>
                    <td className="px-5 py-3 text-text-muted">{r.attempt_number} tentative(s)</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
