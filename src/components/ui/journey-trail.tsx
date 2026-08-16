export type Waypoint = {
  label: string;
  state: "done" | "current" | "todo";
};

function truncate(label: string, max = 16) {
  return label.length > max ? `${label.slice(0, max)}…` : label;
}

export function JourneyTrail({ waypoints }: { waypoints: Waypoint[] }) {
  if (waypoints.length === 0) {
    return <p className="text-sm text-text-faint">Aucune étape pour l&apos;instant.</p>;
  }

  const doneCount = waypoints.filter((w) => w.state === "done").length;
  const currentIndex = waypoints.findIndex((w) => w.state === "current");
  const effectiveDone = currentIndex >= 0 ? currentIndex : doneCount;
  const denom = Math.max(waypoints.length - 1, 1);
  const fillPct = Math.min(100, Math.max(0, (effectiveDone / denom) * 100));

  return (
    <div className="w-full">
      <div className="relative h-1.5 rounded-full bg-border-soft">
        <div
          className="absolute left-0 top-0 h-1.5 rounded-full bg-gradient-to-r from-success to-primary transition-all"
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {waypoints.map((wp, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <span
              className={
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold border-2 " +
                (wp.state === "done"
                  ? "bg-success border-success text-white"
                  : wp.state === "current"
                    ? "bg-primary border-primary text-white shadow-[0_0_0_4px_var(--primary-dim)]"
                    : "bg-bg-elevated border-border text-transparent")
              }
            >
              {wp.state === "done" ? "✓" : ""}
            </span>
            <span
              className={
                "text-[11px] text-center truncate max-w-full " +
                (wp.state === "todo" ? "text-text-faint" : "text-text-muted")
              }
              title={wp.label}
            >
              {truncate(wp.label)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
