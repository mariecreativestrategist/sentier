// Optional, for readers comfortable with a terminal: supabase/schema.sql
// already creates a working demo account (admin@exemple.com / client@exemple.com)
// with minimal content — nothing here is required to get Sentier running.
// This script adds a *richer* demo dataset (5 learners, 2 formations) on top
// of that, useful when developing the app itself. Run once, after applying
// schema.sql:
//   npm run seed
// Uses the service-role key to create demo auth users + demo content. Safe
// to re-run — it skips auth users that already exist, but will insert
// duplicate content rows if run twice against the same content-populated
// project.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_PASSWORD = "sentier2026";

async function createUser(email: string, fullName: string, role: "coach" | "learner", avatarColor: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, avatar_color: avatarColor },
  });
  if (error) {
    if (error.message.includes("already been registered")) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === email);
      if (existing) return existing.id;
    }
    throw error;
  }
  return data.user!.id;
}

async function main() {
  console.log("Creating demo accounts...");
  const coachId = await createUser("coach@sentier.app", "Marie C.", "coach", "neutral");

  const learners = [
    { email: "chloe@sentier.app", name: "Chloé Bernard", color: "sage" },
    { email: "yanis@sentier.app", name: "Yanis Belkacem", color: "gold" },
    { email: "sofia@sentier.app", name: "Sofia Moreau", color: "rose" },
    { email: "hugo@sentier.app", name: "Hugo Lambert", color: "neutral" },
    { email: "lea@sentier.app", name: "Léa Girard", color: "sage" },
  ];
  const learnerIds: Record<string, string> = {};
  for (const l of learners) {
    learnerIds[l.email] = await createUser(l.email, l.name, "learner", l.color);
  }

  console.log("Creating formations + content...");
  const formationsSeed = [
    { name: "Strategy Maker", format: "Cohorte + coaching individuel", description: "Construis ta stratégie de marque de A à Z, avec un accompagnement individuel à chaque étape." },
    { name: "Adkit", format: "Cohorte + ateliers de groupe", description: "Maîtrise la création de publicités performantes, en groupe, avec des ateliers pratiques chaque semaine." },
  ];

  const formationIds: string[] = [];
  for (const f of formationsSeed) {
    const { data } = await supabase.from("formations").insert({ ...f, status: "live" }).select("id").single();
    formationIds.push(data!.id);
  }

  const moduleNames = ["Kickoff & fondations", "Approfondissement", "Mise en pratique"];
  const moduleIdsByFormation: string[][] = [];

  for (const formationId of formationIds) {
    const moduleIds: string[] = [];
    for (let i = 0; i < moduleNames.length; i++) {
      const { data: mod } = await supabase
        .from("modules")
        .insert({ formation_id: formationId, name: moduleNames[i], position: i })
        .select("id")
        .single();
      const moduleId = mod!.id;
      moduleIds.push(moduleId);

      await supabase.from("chapters").insert([
        { module_id: moduleId, title: "Introduction", position: 0, body_html: "<p>Bienvenue dans ce module. Prends le temps de bien poser les bases avant de continuer.</p>" },
        { module_id: moduleId, title: "Aller plus loin", position: 1, body_html: "<h3>Les points clés</h3><p>Voici ce qu'il faut retenir de ce chapitre.</p>" },
      ]);

      await supabase
        .from("exercises")
        .insert({ module_id: moduleId, title: "Exercice pratique", description_html: "<p>Applique ce que tu viens de voir à ton propre contexte et envoie ta réponse.</p>", position: 0 });

      const { data: question } = await supabase
        .from("quiz_questions")
        .insert({ module_id: moduleId, text: "Quelle est la bonne pratique à retenir de ce module ?", position: 0 })
        .select("id")
        .single();
      await supabase.from("quiz_options").insert([
        { question_id: question!.id, text: "Avancer sans cadrer les objectifs", is_correct: false, position: 0 },
        { question_id: question!.id, text: "Clarifier l'objectif avant d'agir", is_correct: true, position: 1 },
        { question_id: question!.id, text: "Copier ce que fait la concurrence", is_correct: false, position: 2 },
        { question_id: question!.id, text: "Ignorer les retours du groupe", is_correct: false, position: 3 },
      ]);
    }
    moduleIdsByFormation.push(moduleIds);
  }

  console.log("Enrolling learners...");
  const enrollmentPlan = [
    { email: "chloe@sentier.app", formationIndex: 0, progress: 33, doneModules: 1 },
    { email: "yanis@sentier.app", formationIndex: 0, progress: 100, doneModules: 3 },
    { email: "sofia@sentier.app", formationIndex: 0, progress: 0, doneModules: 0 },
    { email: "hugo@sentier.app", formationIndex: 1, progress: 66, doneModules: 2 },
    { email: "lea@sentier.app", formationIndex: 1, progress: 33, doneModules: 1 },
  ];

  const enrollmentIdByEmail: Record<string, string> = {};
  for (const plan of enrollmentPlan) {
    const formationId = formationIds[plan.formationIndex];
    const { data: enr } = await supabase
      .from("enrollments")
      .insert({ learner_id: learnerIds[plan.email], formation_id: formationId, progress: plan.progress, status: "ontrack" })
      .select("id")
      .single();
    enrollmentIdByEmail[plan.email] = enr!.id;

    const moduleIds = moduleIdsByFormation[plan.formationIndex];
    for (let i = 0; i < plan.doneModules; i++) {
      await supabase.from("module_progress").insert({ enrollment_id: enr!.id, module_id: moduleIds[i], state: "done" });
    }
  }

  console.log("Adding coaching sessions, slots, notes...");
  const inFiveDays = new Date(Date.now() + 5 * 86400000).toISOString();
  const inTwoDays = new Date(Date.now() + 2 * 86400000).toISOString();
  const yesterday = new Date(Date.now() - 1 * 86400000).toISOString();

  await supabase.from("coaching_sessions").insert([
    { learner_id: learnerIds["chloe@sentier.app"], title: "Point stratégie", scheduled_at: inTwoDays, kind: "individual", status: "a_venir" },
    { learner_id: learnerIds["yanis@sentier.app"], title: "Bilan de formation", scheduled_at: inFiveDays, kind: "individual", status: "a_venir" },
    {
      learner_id: learnerIds["hugo@sentier.app"],
      title: "Session de lancement",
      scheduled_at: yesterday,
      kind: "individual",
      status: "terminee",
      recording_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      transcript: "Nous avons passé en revue les objectifs et posé le plan des 4 prochaines semaines.",
    },
  ]);

  const nextWeek = new Date(Date.now() + 7 * 86400000);
  for (let i = 0; i < 3; i++) {
    const start = new Date(nextWeek.getTime() + i * 86400000);
    start.setHours(10 + i, 0, 0, 0);
    const end = new Date(start.getTime() + 45 * 60000);
    await supabase.from("availability_slots").insert({ start_at: start.toISOString(), end_at: end.toISOString() });
  }

  await supabase.from("group_sessions").insert([
    { formation_id: formationIds[0], title: "Live Q&A mensuel", starts_at: inFiveDays, duration_minutes: 60, meeting_link: "https://meet.google.com/demo" },
    { formation_id: formationIds[1], title: "Atelier création de pub", starts_at: inTwoDays, duration_minutes: 90 },
  ]);

  await supabase.from("coach_notes").insert([
    { learner_id: learnerIds["chloe@sentier.app"], body: "Très bonne dynamique, continue comme ça avant la session de la semaine prochaine." },
    { learner_id: learnerIds["yanis@sentier.app"], body: "Formation terminée avec brio, certificat débloqué." },
  ]);

  console.log("Setting up community channels...");
  const { data: general } = await supabase.from("channels").insert({ name: "Général", post_permission: "all", access_all: true }).select("id").single();
  const { data: annonces } = await supabase.from("channels").insert({ name: "Annonces", post_permission: "coach", access_all: true }).select("id").single();
  const { data: strategyChannel } = await supabase
    .from("channels")
    .insert({ name: "Strategy Maker — entraide", post_permission: "all", access_all: false })
    .select("id")
    .single();
  await supabase.from("channel_formations").insert({ channel_id: strategyChannel!.id, formation_id: formationIds[0] });

  await supabase.from("posts").insert([
    { channel_id: general!.id, author_id: coachId, body: "Bienvenue à toutes et tous sur Sentier ! N'hésitez pas à vous présenter ici." },
    { channel_id: annonces!.id, author_id: coachId, body: "Le prochain live Q&A est planifié — pensez à réserver la date." },
    { channel_id: strategyChannel!.id, author_id: learnerIds["chloe@sentier.app"], body: "Super premier module, hâte de la suite !" },
  ]);

  console.log("Adding documents and payments...");
  await supabase.from("documents").insert([
    { title: "Conditions générales", type: "autre", formation_id: null, learner_id: null },
    { title: "Programme détaillé — Strategy Maker", type: "autre", formation_id: formationIds[0], learner_id: null },
    { title: "Facture — Yanis", type: "facture", formation_id: formationIds[0], learner_id: learnerIds["yanis@sentier.app"] },
  ]);

  await supabase.from("payments").insert([
    { learner_id: learnerIds["chloe@sentier.app"], formation_id: formationIds[0], amount: 890, due_date: new Date().toISOString().slice(0, 10), status: "paye" },
    { learner_id: learnerIds["yanis@sentier.app"], formation_id: formationIds[0], amount: 890, due_date: new Date().toISOString().slice(0, 10), status: "paye" },
    { learner_id: learnerIds["sofia@sentier.app"], formation_id: formationIds[0], amount: 890, due_date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), status: "en_attente" },
  ]);

  console.log("\nDone. Demo accounts (password: sentier2026):");
  console.log("  Coach:   coach@sentier.app");
  learners.forEach((l) => console.log(`  Learner: ${l.email} (${l.name})`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
