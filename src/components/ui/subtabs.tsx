import Link from "next/link";

export function Subtabs({
  tabs,
  active,
  basePath,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  basePath: string;
}) {
  return (
    <div className="flex gap-1 border-b border-border-soft mb-5 overflow-x-auto">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`${basePath}?tab=${t.key}`}
          className={
            "px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition " +
            (t.key === active
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-primary")
          }
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
