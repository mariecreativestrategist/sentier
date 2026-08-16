export function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatTimeRange(start: string | Date, end: string | Date) {
  const fmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${fmt.format(typeof start === "string" ? new Date(start) : start)} – ${fmt.format(typeof end === "string" ? new Date(end) : end)}`;
}

export const docTypeLabel: Record<string, string> = {
  facture: "Facture",
  contrat: "Contrat",
  autre: "Autre",
};

export const formationStatusLabel: Record<string, string> = {
  draft: "Brouillon",
  live: "En cours",
  full: "Places limitées",
  paused: "En pause",
  done: "Terminée",
};
