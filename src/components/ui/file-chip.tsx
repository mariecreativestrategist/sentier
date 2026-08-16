export function FileChip({
  filename,
  onRemove,
}: {
  filename: string;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border-soft bg-bg-elevated-2 px-2.5 py-1 text-xs text-text-primary">
      <span aria-hidden>📎</span>
      <span className="max-w-[160px] truncate">{filename}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-text-faint hover:text-danger ml-1"
          aria-label={`Retirer ${filename}`}
        >
          ✕
        </button>
      )}
    </span>
  );
}
