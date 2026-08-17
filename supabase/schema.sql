-- Sentier — schéma complet + compte de démonstration, en un seul script.
-- À coller intégralement dans Supabase (SQL Editor > New query) et exécuter (Run).
-- Peut être relancé sans risque : tout ce qui existe déjà est simplement ignoré.

-- =========================================================================
-- Extensions
-- =========================================================================
create extension if not exists pgcrypto;

-- =========================================================================
-- Enums (idempotent : ignore l'erreur si le type existe déjà)
-- =========================================================================
do $$ begin create type public.user_role as enum ('coach', 'learner'); exception when duplicate_object then null; end $$;
do $$ begin create type public.formation_status as enum ('draft', 'live', 'full', 'paused', 'done'); exception when duplicate_object then null; end $$;
do $$ begin create type public.module_state as enum ('todo', 'current', 'done'); exception when duplicate_object then null; end $$;
do $$ begin create type public.submission_status as enum ('a_corriger', 'corrige'); exception when duplicate_object then null; end $$;
do $$ begin create type public.document_type as enum ('facture', 'contrat', 'autre'); exception when duplicate_object then null; end $$;
do $$ begin create type public.session_kind as enum ('individual', 'group'); exception when duplicate_object then null; end $$;
do $$ begin create type public.session_status as enum ('a_venir', 'terminee'); exception when duplicate_object then null; end $$;
do $$ begin create type public.post_permission as enum ('all', 'coach'); exception when duplicate_object then null; end $$;
do $$ begin create type public.attachment_owner as enum ('chapter', 'exercise', 'document'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('paye', 'echec', 'en_attente'); exception when duplicate_object then null; end $$;

-- =========================================================================
-- Tables
-- =========================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null default 'learner',
  avatar_color text not null default 'neutral',
  created_at timestamptz not null default now()
);

create table if not exists public.workspace (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Sentier',
  updated_at timestamptz not null default now()
);
insert into public.workspace (name)
select 'Sentier' where not exists (select 1 from public.workspace);

create table if not exists public.formations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  format text not null default 'Cohorte + coaching individuel',
  status public.formation_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations (id) on delete cascade,
  name text not null,
  position int not null default 0
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null,
  video_url text not null default '',
  body_html text not null default '',
  position int not null default 0
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null,
  description_html text not null default '',
  position int not null default 0
);

create table if not exists public.exercise_submissions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  status public.submission_status not null default 'a_corriger',
  comment text,
  note text,
  submitted_at timestamptz not null default now(),
  corrected_at timestamptz,
  unique (exercise_id, learner_id)
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  text text not null,
  position int not null default 0
);

create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  position int not null default 0
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  score int not null,
  total int not null,
  attempt_number int not null default 1,
  created_at timestamptz not null default now(),
  unique (module_id, learner_id)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  formation_id uuid not null references public.formations (id) on delete cascade,
  progress int not null default 0,
  status text not null default 'ontrack',
  created_at timestamptz not null default now(),
  unique (learner_id, formation_id)
);

create table if not exists public.module_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete cascade,
  state public.module_state not null default 'todo',
  unique (enrollment_id, module_id)
);

create table if not exists public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  scheduled_at timestamptz not null,
  kind public.session_kind not null default 'individual',
  status public.session_status not null default 'a_venir',
  recording_url text,
  transcript text,
  created_at timestamptz not null default now()
);

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_booked boolean not null default false,
  booked_by uuid references public.profiles (id) on delete set null,
  session_id uuid references public.coaching_sessions (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  duration_minutes int not null default 60,
  meeting_link text,
  created_at timestamptz not null default now()
);

create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  post_permission public.post_permission not null default 'all',
  access_all boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.channel_formations (
  channel_id uuid not null references public.channels (id) on delete cascade,
  formation_id uuid not null references public.formations (id) on delete cascade,
  primary key (channel_id, formation_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type public.document_type not null default 'autre',
  formation_id uuid references public.formations (id) on delete cascade,
  learner_id uuid references public.profiles (id) on delete cascade,
  storage_path text,
  filename text,
  created_at timestamptz not null default now()
);

-- Suivi manuel des paiements (§3.10) — pas de Stripe/facturation automatisée
-- pour l'instant, le formateur met le statut à jour à la main.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  formation_id uuid not null references public.formations (id) on delete cascade,
  amount numeric(10, 2) not null,
  due_date date not null,
  status public.payment_status not null default 'en_attente',
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_type public.attachment_owner not null,
  owner_id uuid not null,
  filename text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Messagerie 1:1 formateur <-> apprenant (une conversation par apprenant,
-- un seul formateur par espace).
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (learner_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Rappels de session : évite de renvoyer le même rappel plusieurs fois si le
-- job cron tourne plus d'une fois avant la session.
alter table public.coaching_sessions add column if not exists reminder_sent boolean not null default false;

-- =========================================================================
-- Trigger : crée automatiquement une ligne "profiles" pour chaque nouveau
-- compte Supabase Auth (le rôle/nom viennent des métadonnées du compte).
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, avatar_color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'learner'),
    coalesce(new.raw_user_meta_data ->> 'avatar_color', 'neutral')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- Fonctions utilitaires pour les policies (security definer = pas de
-- récursion RLS quand elles interrogent profiles/enrollments elles-mêmes)
-- =========================================================================
create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'
  );
$$;

create or replace function public.is_enrolled(p_formation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments e
    where e.formation_id = p_formation_id and e.learner_id = auth.uid()
  );
$$;

create or replace function public.formation_of_module(p_module_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select formation_id from public.modules where id = p_module_id;
$$;

create or replace function public.formation_of_exercise(p_exercise_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.formation_id from public.exercises e
  join public.modules m on m.id = e.module_id
  where e.id = p_exercise_id;
$$;

create or replace function public.can_view_attachment(p_owner_type public.attachment_owner, p_owner_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.is_coach() then
    return true;
  end if;

  if p_owner_type = 'chapter' then
    return exists (
      select 1 from public.chapters c
      join public.modules m on m.id = c.module_id
      where c.id = p_owner_id and public.is_enrolled(m.formation_id)
    );
  elsif p_owner_type = 'exercise' then
    return exists (
      select 1 from public.exercises ex
      join public.modules m on m.id = ex.module_id
      where ex.id = p_owner_id and public.is_enrolled(m.formation_id)
    );
  elsif p_owner_type = 'document' then
    return exists (
      select 1 from public.documents d
      where d.id = p_owner_id
      and (
        d.learner_id = auth.uid()
        or (d.formation_id is not null and public.is_enrolled(d.formation_id))
        or (d.formation_id is null and d.learner_id is null)
      )
    );
  end if;

  return false;
end;
$$;

create or replace function public.can_view_channel(p_channel_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_access_all boolean;
begin
  if public.is_coach() then
    return true;
  end if;

  select access_all into v_access_all from public.channels where id = p_channel_id;
  if v_access_all then
    return true;
  end if;

  return exists (
    select 1 from public.channel_formations cf
    where cf.channel_id = p_channel_id and public.is_enrolled(cf.formation_id)
  );
end;
$$;

-- =========================================================================
-- Row Level Security — chaque formateur (il n'y en a qu'un par espace) voit
-- tout, chaque apprenant ne voit que ses propres données.
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.workspace enable row level security;
alter table public.formations enable row level security;
alter table public.modules enable row level security;
alter table public.chapters enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_submissions enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.enrollments enable row level security;
alter table public.module_progress enable row level security;
alter table public.coaching_sessions enable row level security;
alter table public.availability_slots enable row level security;
alter table public.group_sessions enable row level security;
alter table public.coach_notes enable row level security;
alter table public.channels enable row level security;
alter table public.channel_formations enable row level security;
alter table public.posts enable row level security;
alter table public.documents enable row level security;
alter table public.attachments enable row level security;
alter table public.payments enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or public.is_coach());
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid() or public.is_coach());

drop policy if exists "workspace_select" on public.workspace;
create policy "workspace_select" on public.workspace for select using (true);
drop policy if exists "workspace_update" on public.workspace;
create policy "workspace_update" on public.workspace for update using (public.is_coach());

drop policy if exists "formations_select" on public.formations;
create policy "formations_select" on public.formations for select
  using (public.is_coach() or public.is_enrolled(id));
drop policy if exists "formations_write" on public.formations;
create policy "formations_write" on public.formations for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "modules_select" on public.modules;
create policy "modules_select" on public.modules for select
  using (public.is_coach() or public.is_enrolled(formation_id));
drop policy if exists "modules_write" on public.modules;
create policy "modules_write" on public.modules for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "chapters_select" on public.chapters;
create policy "chapters_select" on public.chapters for select
  using (public.is_coach() or public.is_enrolled(public.formation_of_module(module_id)));
drop policy if exists "chapters_write" on public.chapters;
create policy "chapters_write" on public.chapters for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "exercises_select" on public.exercises;
create policy "exercises_select" on public.exercises for select
  using (public.is_coach() or public.is_enrolled(public.formation_of_module(module_id)));
drop policy if exists "exercises_write" on public.exercises;
create policy "exercises_write" on public.exercises for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "quiz_questions_select" on public.quiz_questions;
create policy "quiz_questions_select" on public.quiz_questions for select
  using (public.is_coach() or public.is_enrolled(public.formation_of_module(module_id)));
drop policy if exists "quiz_questions_write" on public.quiz_questions;
create policy "quiz_questions_write" on public.quiz_questions for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "quiz_options_select" on public.quiz_options;
create policy "quiz_options_select" on public.quiz_options for select
  using (
    public.is_coach()
    or exists (
      select 1 from public.quiz_questions q
      where q.id = question_id and public.is_enrolled(public.formation_of_module(q.module_id))
    )
  );
drop policy if exists "quiz_options_write" on public.quiz_options;
create policy "quiz_options_write" on public.quiz_options for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "submissions_select" on public.exercise_submissions;
create policy "submissions_select" on public.exercise_submissions for select
  using (learner_id = auth.uid() or public.is_coach());
drop policy if exists "submissions_insert" on public.exercise_submissions;
create policy "submissions_insert" on public.exercise_submissions for insert
  with check (learner_id = auth.uid() or public.is_coach());
drop policy if exists "submissions_update" on public.exercise_submissions;
create policy "submissions_update" on public.exercise_submissions for update
  using (public.is_coach());

drop policy if exists "quiz_attempts_select" on public.quiz_attempts;
create policy "quiz_attempts_select" on public.quiz_attempts for select
  using (learner_id = auth.uid() or public.is_coach());
drop policy if exists "quiz_attempts_insert" on public.quiz_attempts;
create policy "quiz_attempts_insert" on public.quiz_attempts for insert
  with check (learner_id = auth.uid());

drop policy if exists "enrollments_select" on public.enrollments;
create policy "enrollments_select" on public.enrollments for select
  using (learner_id = auth.uid() or public.is_coach());
drop policy if exists "enrollments_write" on public.enrollments;
create policy "enrollments_write" on public.enrollments for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "module_progress_select" on public.module_progress;
create policy "module_progress_select" on public.module_progress for select
  using (
    public.is_coach()
    or exists (select 1 from public.enrollments e where e.id = enrollment_id and e.learner_id = auth.uid())
  );
drop policy if exists "module_progress_upsert" on public.module_progress;
create policy "module_progress_upsert" on public.module_progress for insert
  with check (
    public.is_coach()
    or exists (select 1 from public.enrollments e where e.id = enrollment_id and e.learner_id = auth.uid())
  );
drop policy if exists "module_progress_update" on public.module_progress;
create policy "module_progress_update" on public.module_progress for update
  using (
    public.is_coach()
    or exists (select 1 from public.enrollments e where e.id = enrollment_id and e.learner_id = auth.uid())
  );

drop policy if exists "sessions_select" on public.coaching_sessions;
create policy "sessions_select" on public.coaching_sessions for select
  using (learner_id = auth.uid() or public.is_coach());
drop policy if exists "sessions_insert" on public.coaching_sessions;
create policy "sessions_insert" on public.coaching_sessions for insert
  with check (learner_id = auth.uid() or public.is_coach());
drop policy if exists "sessions_update" on public.coaching_sessions;
create policy "sessions_update" on public.coaching_sessions for update
  using (public.is_coach());

-- La réservation d'un créneau est une UPDATE atomique protégée par
-- is_booked = false, à la fois dans la requête applicative et dans cette
-- policy : ça élimine le risque que deux apprenants réservent le même créneau.
drop policy if exists "slots_select" on public.availability_slots;
create policy "slots_select" on public.availability_slots for select using (true);
drop policy if exists "slots_write_coach" on public.availability_slots;
create policy "slots_write_coach" on public.availability_slots for insert with check (public.is_coach());
drop policy if exists "slots_delete_coach" on public.availability_slots;
create policy "slots_delete_coach" on public.availability_slots for delete using (public.is_coach());
drop policy if exists "slots_book" on public.availability_slots;
create policy "slots_book" on public.availability_slots for update
  using (is_booked = false or public.is_coach())
  with check (public.is_coach() or booked_by = auth.uid());

drop policy if exists "group_sessions_select" on public.group_sessions;
create policy "group_sessions_select" on public.group_sessions for select
  using (public.is_coach() or public.is_enrolled(formation_id));
drop policy if exists "group_sessions_write" on public.group_sessions;
create policy "group_sessions_write" on public.group_sessions for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "coach_notes_all" on public.coach_notes;
create policy "coach_notes_all" on public.coach_notes for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "channels_select" on public.channels;
create policy "channels_select" on public.channels for select
  using (public.can_view_channel(id));
drop policy if exists "channels_write" on public.channels;
create policy "channels_write" on public.channels for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "channel_formations_select" on public.channel_formations;
create policy "channel_formations_select" on public.channel_formations for select
  using (public.can_view_channel(channel_id));
drop policy if exists "channel_formations_write" on public.channel_formations;
create policy "channel_formations_write" on public.channel_formations for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts for select
  using (public.can_view_channel(channel_id));
drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts for insert
  with check (
    author_id = auth.uid()
    and public.can_view_channel(channel_id)
    and (
      public.is_coach()
      or exists (select 1 from public.channels c where c.id = channel_id and c.post_permission = 'all')
    )
  );

drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents for select
  using (
    public.is_coach()
    or learner_id = auth.uid()
    or (formation_id is not null and public.is_enrolled(formation_id))
    or (formation_id is null and learner_id is null)
  );
drop policy if exists "documents_write" on public.documents;
create policy "documents_write" on public.documents for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments for select
  using (learner_id = auth.uid() or public.is_coach());
drop policy if exists "payments_write" on public.payments;
create policy "payments_write" on public.payments for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "attachments_select" on public.attachments;
create policy "attachments_select" on public.attachments for select
  using (public.can_view_attachment(owner_type, owner_id));
drop policy if exists "attachments_write" on public.attachments;
create policy "attachments_write" on public.attachments for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations for select
  using (learner_id = auth.uid() or public.is_coach());
drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert" on public.conversations for insert
  with check (learner_id = auth.uid() or public.is_coach());

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select
  using (
    public.is_coach()
    or exists (select 1 from public.conversations c where c.id = conversation_id and c.learner_id = auth.uid())
  );
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  with check (
    author_id = auth.uid()
    and (
      public.is_coach()
      or exists (select 1 from public.conversations c where c.id = conversation_id and c.learner_id = auth.uid())
    )
  );

-- =========================================================================
-- Stockage des fichiers (chapitres, exercices, documents administratifs)
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

drop policy if exists "files_select" on storage.objects;
create policy "files_select" on storage.objects for select
  using (
    bucket_id = 'files'
    and (
      public.is_coach()
      or exists (
        select 1 from public.attachments a
        where a.storage_path = storage.objects.name
        and public.can_view_attachment(a.owner_type, a.owner_id)
      )
      or exists (
        select 1 from public.documents d
        where d.storage_path = storage.objects.name
        and (
          d.learner_id = auth.uid()
          or (d.formation_id is not null and public.is_enrolled(d.formation_id))
          or (d.formation_id is null and d.learner_id is null)
        )
      )
    )
  );
drop policy if exists "files_write_coach" on storage.objects;
create policy "files_write_coach" on storage.objects for insert
  with check (bucket_id = 'files' and public.is_coach());
drop policy if exists "files_update_coach" on storage.objects;
create policy "files_update_coach" on storage.objects for update
  using (bucket_id = 'files' and public.is_coach());
drop policy if exists "files_delete_coach" on storage.objects;
create policy "files_delete_coach" on storage.objects for delete
  using (bucket_id = 'files' and public.is_coach());

-- =========================================================================
-- Compte de démonstration (formateur + apprenant) et contenu associé.
--
-- ⚠️ Ce bloc écrit directement dans auth.users / auth.identities, les
-- tables internes de Supabase Auth — leur structure exacte peut varier
-- légèrement selon la version de ton projet. Si cette partie échoue :
-- crée les deux comptes à la main depuis Authentication → Users → Add user
-- (admin@exemple.com / changeme123 puis client@exemple.com / changeme123,
-- en cochant "Auto Confirm User"), puis relance ce script en le collant
-- une seconde fois — les tables existent déjà et seront ignorées, seul le
-- contenu de démonstration manquant sera ajouté.
-- =========================================================================
do $$
declare
  v_coach_id uuid;
  v_learner_id uuid;
  v_formation_id uuid;
  v_module1_id uuid;
  v_module2_id uuid;
  v_exercise_id uuid;
  v_question_id uuid;
  v_enrollment_id uuid;
  v_channel_id uuid;
  v_conversation_id uuid;
begin
  -- Compte formateur
  if not exists (select 1 from auth.users where email = 'admin@exemple.com') then
    v_coach_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_coach_id, 'authenticated', 'authenticated',
      'admin@exemple.com', crypt('changeme123', gen_salt('bf', 10)),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', 'Marie (démo)', 'role', 'coach', 'avatar_color', 'neutral'),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_coach_id, v_coach_id::text,
      jsonb_build_object('sub', v_coach_id::text, 'email', 'admin@exemple.com'),
      'email', now(), now(), now()
    );
  end if;

  -- Compte apprenant de démo
  if not exists (select 1 from auth.users where email = 'client@exemple.com') then
    v_learner_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_learner_id, 'authenticated', 'authenticated',
      'client@exemple.com', crypt('changeme123', gen_salt('bf', 10)),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', 'Client (démo)', 'role', 'learner', 'avatar_color', 'sage'),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_learner_id, v_learner_id::text,
      jsonb_build_object('sub', v_learner_id::text, 'email', 'client@exemple.com'),
      'email', now(), now(), now()
    );
  end if;

  -- Contenu de démonstration — seulement si la formation de démo n'existe pas déjà
  if not exists (select 1 from public.formations where name = 'Formation de démonstration') then
    select id into v_coach_id from public.profiles where email = 'admin@exemple.com';
    select id into v_learner_id from public.profiles where email = 'client@exemple.com';

    insert into public.formations (name, description, format, status)
    values ('Formation de démonstration', 'Formation créée automatiquement pour tester Sentier.', 'Cohorte + coaching individuel', 'live')
    returning id into v_formation_id;

    insert into public.modules (formation_id, name, position) values (v_formation_id, 'Kickoff & fondations', 0) returning id into v_module1_id;
    insert into public.modules (formation_id, name, position) values (v_formation_id, 'Mise en pratique', 1) returning id into v_module2_id;

    insert into public.chapters (module_id, title, position, body_html) values
      (v_module1_id, 'Bienvenue', 0, '<p>Bienvenue dans cette formation de démonstration.</p>'),
      (v_module1_id, 'Les fondations', 1, '<h3>Les points clés</h3><p>Contenu du deuxième chapitre.</p>');

    insert into public.exercises (module_id, title, description_html, position)
    values (v_module1_id, 'Exercice de démonstration', '<p>Décris en quelques lignes ton objectif principal.</p>', 0)
    returning id into v_exercise_id;

    insert into public.quiz_questions (module_id, text, position)
    values (v_module1_id, 'Quelle est la bonne pratique à retenir ?', 0)
    returning id into v_question_id;
    insert into public.quiz_options (question_id, text, is_correct, position) values
      (v_question_id, 'Avancer sans cadrer les objectifs', false, 0),
      (v_question_id, 'Clarifier l''objectif avant d''agir', true, 1),
      (v_question_id, 'Ignorer les retours du groupe', false, 2);

    insert into public.enrollments (learner_id, formation_id, progress, status)
    values (v_learner_id, v_formation_id, 0, 'ontrack')
    returning id into v_enrollment_id;

    insert into public.coaching_sessions (learner_id, title, scheduled_at, kind, status)
    values (v_learner_id, 'Session de bienvenue', now() + interval '3 days', 'individual', 'a_venir');
    insert into public.coaching_sessions (learner_id, title, scheduled_at, kind, status, recording_url, transcript)
    values (v_learner_id, 'Kickoff', now() - interval '2 days', 'individual', 'terminee',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Notes de la session de kickoff.');

    insert into public.availability_slots (start_at, end_at) values
      (now() + interval '5 days' + interval '10 hours', now() + interval '5 days' + interval '10 hours 45 minutes'),
      (now() + interval '6 days' + interval '14 hours', now() + interval '6 days' + interval '14 hours 45 minutes');

    insert into public.group_sessions (formation_id, title, starts_at, duration_minutes)
    values (v_formation_id, 'Live Q&A mensuel', now() + interval '7 days', 60);

    insert into public.coach_notes (learner_id, body)
    values (v_learner_id, 'Premier échange positif, bonne dynamique.');

    insert into public.channels (name, post_permission, access_all) values ('Général', 'all', true) returning id into v_channel_id;
    insert into public.posts (channel_id, author_id, body)
    values (v_channel_id, v_coach_id, 'Bienvenue sur Sentier ! N''hésite pas à te présenter ici.');

    insert into public.documents (title, type, formation_id, learner_id)
    values ('Facture de démonstration', 'facture', v_formation_id, v_learner_id);

    insert into public.payments (learner_id, formation_id, amount, due_date, status)
    values (v_learner_id, v_formation_id, 890, current_date, 'paye');

    insert into public.conversations (learner_id) values (v_learner_id) returning id into v_conversation_id;
    insert into public.messages (conversation_id, author_id, body)
    values (v_conversation_id, v_coach_id, 'Bienvenue ! N''hésite pas à m''écrire ici si tu as une question.');
  end if;
end $$;
