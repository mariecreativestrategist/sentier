const colorClasses: Record<string, string> = {
  sage: "bg-accent-sage-dim text-accent-sage",
  gold: "bg-accent-gold-dim text-accent-gold",
  rose: "bg-accent-rose-dim text-accent-rose",
  neutral: "bg-accent-neutral-dim text-accent-neutral",
};

export function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Avatar({
  name,
  color = "neutral",
  size = "md",
}: {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClasses} ${colorClasses[color] ?? colorClasses.neutral}`}
    >
      {initialsOf(name)}
    </span>
  );
}
