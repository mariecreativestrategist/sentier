import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Subtabs } from "@/components/ui/subtabs";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatDateTime, formatTimeRange } from "@/lib/format";
import { addGroupLive, addSlot, confirmDirectBooking, removeGroupLive, removeSlot } from "./actions";

export default async function CoachingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireProfile("coach");
  const { tab } = await searchParams;
  const activeTab = tab ?? "calendrier";
  const supabase = await createClient();
  const now = new Date().toISOString();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-text-primary">Sessions coaching</h1>
        <Link
          href="/admin/coaching?tab=creneaux"
          className="rounded-[var(--radius-sm)] bg-primary text-white text-sm font-medium px-3.5 py-2 hover:opacity-90"
        >
          Ouvrir un créneau
        </Link>
      </div>

      <Subtabs
        basePath="/admin/coaching"
        active={activeTab}
        tabs={[
          { key: "calendrier", label: "Calendrier" },
          { key: "lives", label: "Lives de groupe" },
          { key: "creneaux", label: "Créneaux disponibles" },
          { key: "recaps", label: "Comptes-rendus" },
        ]}
      />

      {activeTab === "calendrier" && <CalendrierTab />}
      {activeTab === "lives" && <LivesTab />}
      {activeTab === "creneaux" && <CreneauxTab />}
      {activeTab === "recaps" && <RecapsTab />}
    </div>
  );

  async function CalendrierTab() {
    const [{ data: sessions }, { data: lives }] = await Promise.all([
      supabase
        .from("coaching_sessions")
        .select("id, title, scheduled_at, profiles(full_name, avatar_color)")
        .eq("status", "a_venir")
        .gte("scheduled_at", now)
        .order("scheduled_at"),
      supabase
        .from("group_sessions")
        .select("id, title, starts_at, formations(name)")
        .gte("starts_at", now)
        .order("starts_at"),
    ]);

    const items = [
      ...(sessions ?? []).map((s) => ({
        key: `s-${s.id}`,
        date: s.scheduled_at,
        label: s.title,
        sub: (s.profiles as unknown as { full_name: string } | null)?.full_name ?? "—",
        kind: "individuel" as const,
      })),
      ...(lives ?? []).map((l) => ({
        key: `l-${l.id}`,
        date: l.starts_at,
        label: l.title,
        sub: (l.formations as unknown as { name: string } | null)?.name ?? "—",
        kind: "groupe" as const,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div className="card divide-y divide-border-soft">
        {items.length === 0 ? (
          <EmptyState icon="🗓️" title="Rien de planifié" />
        ) : (
          items.map((it) => (
            <div key={it.key} className="flex items-center gap-3 px-5 py-4">
              <span className="font-mono text-xs text-text-muted w-32 shrink-0">{formatDateTime(it.date)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{it.label}</p>
                <p className="text-xs text-text-muted">{it.sub}</p>
              </div>
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${it.kind === "groupe" ? "bg-accent-gold-dim text-accent-gold" : "bg-primary-dim text-primary"}`}
              >
                {it.kind === "groupe" ? "Groupe" : "Individuel"}
              </span>
            </div>
          ))
        )}
      </div>
    );
  }

  async function LivesTab() {
    const [{ data: lives }, { data: formations }] = await Promise.all([
      supabase
        .from("group_sessions")
        .select("*, formations(name)")
        .order("starts_at", { ascending: false }),
      supabase.from("formations").select("id, name").order("name"),
    ]);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card divide-y divide-border-soft">
          {!lives || lives.length === 0 ? (
            <EmptyState icon="🎥" title="Aucun live planifié" />
          ) : (
            lives.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-text-primary">{l.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {(l.formations as unknown as { name: string } | null)?.name} · {formatDateTime(l.starts_at)} ·{" "}
                    {l.duration_minutes} min{l.meeting_link ? " · lien visio ajouté" : ""}
                  </p>
                </div>
                <form action={removeGroupLive.bind(null, l.id)}>
                  <SubmitButton variant="ghost" pendingLabel="...">✕</SubmitButton>
                </form>
              </div>
            ))
          )}
        </div>
        <form action={addGroupLive} className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-text-primary">Planifier un live de groupe</p>
          <input
            name="title"
            required
            placeholder="Titre (atelier, Q&A, masterclass…)"
            className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
          />
          <select name="formationId" required className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm">
            <option value="">Formation…</option>
            {(formations ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="date" name="date" required className="flex-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm" />
            <input type="time" name="time" required className="flex-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm" />
          </div>
          <input
            type="number"
            name="duration"
            defaultValue={60}
            min={15}
            step={15}
            placeholder="Durée (min)"
            className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm"
          />
          <input
            name="link"
            placeholder="Lien de visioconférence (facultatif)"
            className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm"
          />
          <SubmitButton pendingLabel="Planification...">Planifier</SubmitButton>
        </form>
      </div>
    );
  }

  async function CreneauxTab() {
    const [{ data: slots }, { data: learners }] = await Promise.all([
      supabase.from("availability_slots").select("*").eq("is_booked", false).gte("start_at", now).order("start_at"),
      supabase.from("profiles").select("id, full_name").eq("role", "learner").order("full_name"),
    ]);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="card divide-y divide-border-soft mb-4">
            {!slots || slots.length === 0 ? (
              <EmptyState icon="🕒" title="Aucun créneau ouvert" />
            ) : (
              slots.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm text-text-primary">{formatDate(s.start_at)}</p>
                    <p className="font-mono text-xs text-text-muted">{formatTimeRange(s.start_at, s.end_at)}</p>
                  </div>
                  <form action={removeSlot.bind(null, s.id)}>
                    <SubmitButton variant="ghost" pendingLabel="...">✕</SubmitButton>
                  </form>
                </div>
              ))
            )}
          </div>
          <form action={addSlot} className="card p-5 space-y-3">
            <p className="text-sm font-semibold text-text-primary">Ouvrir un créneau</p>
            <div className="flex gap-2">
              <input type="date" name="date" required className="flex-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm" />
              <input type="time" name="time" required className="flex-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm" />
            </div>
            <input
              type="number"
              name="duration"
              defaultValue={60}
              min={15}
              step={15}
              placeholder="Durée (min)"
              className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm"
            />
            <SubmitButton pendingLabel="Ouverture...">Ouvrir le créneau</SubmitButton>
          </form>
        </div>

        <form action={confirmDirectBooking} className="card p-5 space-y-3 h-fit">
          <p className="text-sm font-semibold text-text-primary">Fixer un rendez-vous directement</p>
          <select name="learnerId" required className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm">
            <option value="">Apprenant…</option>
            {(learners ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name}
              </option>
            ))}
          </select>
          <input
            name="title"
            required
            placeholder="Objet du rendez-vous"
            className="w-full rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <input type="date" name="date" required className="flex-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm" />
            <input type="time" name="time" required className="flex-1 rounded-[var(--radius-sm)] border border-border px-2.5 py-1.5 text-sm" />
          </div>
          <SubmitButton pendingLabel="Confirmation...">Confirmer le rendez-vous</SubmitButton>
        </form>
      </div>
    );
  }

  async function RecapsTab() {
    const { data: notes } = await supabase
      .from("coach_notes")
      .select("*, profiles(id, full_name, avatar_color)")
      .order("created_at", { ascending: false })
      .limit(30);

    return (
      <div className="card divide-y divide-border-soft">
        {!notes || notes.length === 0 ? (
          <EmptyState icon="🗒️" title="Aucun compte-rendu" />
        ) : (
          notes.map((n) => {
            const learner = n.profiles as unknown as { id: string; full_name: string; avatar_color: string } | null;
            return (
              <Link key={n.id} href={`/admin/apprenants/${learner?.id}?tab=notes`} className="flex items-start gap-3 px-5 py-4 hover:bg-bg-elevated-2">
                <Avatar name={learner?.full_name ?? "—"} color={learner?.avatar_color} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{learner?.full_name}</p>
                    <span className="font-mono text-xs text-text-faint">{formatDate(n.created_at)}</span>
                  </div>
                  <p className="text-sm text-text-muted mt-0.5">{n.body}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    );
  }
}
