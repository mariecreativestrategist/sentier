import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";

export default async function CertificatPage() {
  const profile = await requireProfile("learner");
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("progress, formations(name)")
    .eq("learner_id", profile.id)
    .maybeSingle();

  const formationName = (enrollment?.formations as unknown as { name: string } | null)?.name;
  const progress = enrollment?.progress ?? 0;

  return (
    <div>
      <h1 className="text-lg font-semibold text-text-primary mb-6">Certificat</h1>
      {progress >= 100 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl mb-3">🎓</p>
          <p className="text-base font-semibold text-text-primary">Félicitations !</p>
          <p className="text-sm text-text-muted mt-1">{formationName}</p>
          <button
            type="button"
            disabled
            className="mt-5 rounded-[var(--radius-sm)] bg-primary text-white text-sm font-medium px-4 py-2 opacity-60 cursor-not-allowed"
            title="Génération PDF réelle prévue en phase 2"
          >
            Télécharger le certificat (PDF)
          </button>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon="🔒"
            title="Certificat verrouillé"
            description={`${progress}% de la formation complétée — encore ${100 - progress}% avant de débloquer ton certificat.`}
          />
        </div>
      )}
    </div>
  );
}
