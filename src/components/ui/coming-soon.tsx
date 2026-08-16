import { EmptyState } from "./empty-state";

export function ComingSoonPage({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <h1 className="text-lg font-semibold text-text-primary mb-6">{title}</h1>
      <div className="card">
        <EmptyState
          icon="🚧"
          title="Pas encore dans le cahier des charges"
          description={
            note ??
            "Cet écran existe dans le prototype de démonstration mais n'est pas décrit dans le cahier des charges — à spécifier avant développement."
          }
        />
      </div>
    </div>
  );
}
