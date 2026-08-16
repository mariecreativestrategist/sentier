import type { Waypoint } from "@/components/ui/journey-trail";

// module_progress rows are only ever written with state = 'done' (see
// espace/formation/[moduleId]/actions.ts markModuleDone). "current" is
// derived here as the first module that isn't done yet, rather than stored,
// so there's a single source of truth instead of two fields that can drift.
export function deriveModuleWaypoints<T extends { id: string; name: string }>(
  modules: T[],
  doneModuleIds: Set<string>
): Waypoint[] {
  let currentAssigned = false;
  return modules.map((m) => {
    if (doneModuleIds.has(m.id)) return { label: m.name, state: "done" as const };
    if (!currentAssigned) {
      currentAssigned = true;
      return { label: m.name, state: "current" as const };
    }
    return { label: m.name, state: "todo" as const };
  });
}
