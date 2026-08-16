-- Sentier — initial schema, RLS policies, and storage bucket.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query > paste > Run).

-- =========================================================================
-- Extensions
-- =========================================================================
create extension if not exists pgcrypto;

-- =========================================================================
-- Enums
-- =========================================================================
create type public.user_role as enum ('coach', 'learner');
create type public.formation_status as enum ('draft', 'live', 'full', 'paused', 'done');
create type public.module_state as enum ('todo', 'current', 'done');
create type public.submission_status as enum ('a_corriger', 'corrige');
create type public.document_type as enum ('facture', 'contrat', 'autre');
create type public.session_kind as enum ('individual', 'group');
create type public.session_status as enum ('a_venir', 'terminee');
create type public.post_permission as enum ('all', 'coach');
create type public.attachment_owner as enum ('chapter', 'exercise', 'document');
create type public.payment_status as enum ('paye', 'echec', 'en_attente');

-- =========================================================================
-- Core tables
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null default 'learner',
  avatar_color text not null default 'neutral',
  created_at timestamptz not null default now()
);

create table public.workspace (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Sentier',
  updated_at timestamptz not null default now()
);
insert into public.workspace (name) values ('Sentier');

create table public.formations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  format text not null default 'Cohorte + coaching individuel',
  status public.formation_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations (id) on delete cascade,
  name text not null,
  position int not null default 0
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null,
  video_url text not null default '',
  body_html text not null default '',
  position int not null default 0
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null,
  description_html text not null default '',
  position int not null default 0
);

create table public.exercise_submissions (
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

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  text text not null,
  position int not null default 0
);

create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  position int not null default 0
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  score int not null,
  total int not null,
  attempt_number int not null default 1,
  created_at timestamptz not null default now(),
  unique (module_id, learner_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  formation_id uuid not null references public.formations (id) on delete cascade,
  progress int not null default 0,
  status text not null default 'ontrack',
  created_at timestamptz not null default now(),
  unique (learner_id, formation_id)
);

create table public.module_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete cascade,
  state public.module_state not null default 'todo',
  unique (enrollment_id, module_id)
);

create table public.coaching_sessions (
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

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_booked boolean not null default false,
  booked_by uuid references public.profiles (id) on delete set null,
  session_id uuid references public.coaching_sessions (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  duration_minutes int not null default 60,
  meeting_link text,
  created_at timestamptz not null default now()
);

create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  post_permission public.post_permission not null default 'all',
  access_all boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.channel_formations (
  channel_id uuid not null references public.channels (id) on delete cascade,
  formation_id uuid not null references public.formations (id) on delete cascade,
  primary key (channel_id, formation_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type public.document_type not null default 'autre',
  formation_id uuid references public.formations (id) on delete cascade,
  learner_id uuid references public.profiles (id) on delete cascade,
  storage_path text,
  filename text,
  created_at timestamptz not null default now()
);

-- Manual payment tracking (§3.10) — no Stripe/automated billing in Phase 1,
-- see the plan's "explicitly deferred" list. The coach sets status by hand.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  formation_id uuid not null references public.formations (id) on delete cascade,
  amount numeric(10, 2) not null,
  due_date date not null,
  status public.payment_status not null default 'en_attente',
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_type public.attachment_owner not null,
  owner_id uuid not null,
  filename text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Auth trigger — creates a profile row whenever a Supabase auth user is created.
-- seed.ts passes role/full_name via user_metadata so this trigger assigns them correctly.
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
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- Helper functions (security definer to avoid RLS recursion)
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
-- Row Level Security
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

-- profiles
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or public.is_coach());
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid() or public.is_coach());

-- workspace
create policy "workspace_select" on public.workspace for select using (true);
create policy "workspace_update" on public.workspace for update using (public.is_coach());

-- formations
create policy "formations_select" on public.formations for select
  using (public.is_coach() or public.is_enrolled(id));
create policy "formations_write" on public.formations for all
  using (public.is_coach()) with check (public.is_coach());

-- modules / chapters / exercises / quiz (read scoped to enrollment, write coach-only)
create policy "modules_select" on public.modules for select
  using (public.is_coach() or public.is_enrolled(formation_id));
create policy "modules_write" on public.modules for all
  using (public.is_coach()) with check (public.is_coach());

create policy "chapters_select" on public.chapters for select
  using (public.is_coach() or public.is_enrolled(public.formation_of_module(module_id)));
create policy "chapters_write" on public.chapters for all
  using (public.is_coach()) with check (public.is_coach());

create policy "exercises_select" on public.exercises for select
  using (public.is_coach() or public.is_enrolled(public.formation_of_module(module_id)));
create policy "exercises_write" on public.exercises for all
  using (public.is_coach()) with check (public.is_coach());

create policy "quiz_questions_select" on public.quiz_questions for select
  using (public.is_coach() or public.is_enrolled(public.formation_of_module(module_id)));
create policy "quiz_questions_write" on public.quiz_questions for all
  using (public.is_coach()) with check (public.is_coach());

create policy "quiz_options_select" on public.quiz_options for select
  using (
    public.is_coach()
    or exists (
      select 1 from public.quiz_questions q
      where q.id = question_id and public.is_enrolled(public.formation_of_module(q.module_id))
    )
  );
create policy "quiz_options_write" on public.quiz_options for all
  using (public.is_coach()) with check (public.is_coach());

-- exercise submissions: learner owns theirs (insert + select), coach grades (update, select all)
create policy "submissions_select" on public.exercise_submissions for select
  using (learner_id = auth.uid() or public.is_coach());
create policy "submissions_insert" on public.exercise_submissions for insert
  with check (learner_id = auth.uid() or public.is_coach());
create policy "submissions_update" on public.exercise_submissions for update
  using (public.is_coach());

-- quiz attempts: learner inserts/reads own, coach reads all
create policy "quiz_attempts_select" on public.quiz_attempts for select
  using (learner_id = auth.uid() or public.is_coach());
create policy "quiz_attempts_insert" on public.quiz_attempts for insert
  with check (learner_id = auth.uid());

-- enrollments
create policy "enrollments_select" on public.enrollments for select
  using (learner_id = auth.uid() or public.is_coach());
create policy "enrollments_write" on public.enrollments for all
  using (public.is_coach()) with check (public.is_coach());

-- module_progress: learner can read/update their own (via enrollment), coach full
create policy "module_progress_select" on public.module_progress for select
  using (
    public.is_coach()
    or exists (select 1 from public.enrollments e where e.id = enrollment_id and e.learner_id = auth.uid())
  );
create policy "module_progress_upsert" on public.module_progress for insert
  with check (
    public.is_coach()
    or exists (select 1 from public.enrollments e where e.id = enrollment_id and e.learner_id = auth.uid())
  );
create policy "module_progress_update" on public.module_progress for update
  using (
    public.is_coach()
    or exists (select 1 from public.enrollments e where e.id = enrollment_id and e.learner_id = auth.uid())
  );

-- coaching sessions: learner sees/creates their own, coach full
create policy "sessions_select" on public.coaching_sessions for select
  using (learner_id = auth.uid() or public.is_coach());
create policy "sessions_insert" on public.coaching_sessions for insert
  with check (learner_id = auth.uid() or public.is_coach());
create policy "sessions_update" on public.coaching_sessions for update
  using (public.is_coach());

-- availability slots: everyone enrolled-or-coach can read; booking is an atomic
-- UPDATE guarded by is_booked = false in both the query and this policy, which is
-- what prevents the double-booking race condition from the prototype.
create policy "slots_select" on public.availability_slots for select using (true);
create policy "slots_write_coach" on public.availability_slots for insert with check (public.is_coach());
create policy "slots_delete_coach" on public.availability_slots for delete using (public.is_coach());
create policy "slots_book" on public.availability_slots for update
  using (is_booked = false or public.is_coach())
  with check (public.is_coach() or booked_by = auth.uid());

-- group sessions: visible to enrolled learners + coach; coach writes
create policy "group_sessions_select" on public.group_sessions for select
  using (public.is_coach() or public.is_enrolled(formation_id));
create policy "group_sessions_write" on public.group_sessions for all
  using (public.is_coach()) with check (public.is_coach());

-- coach notes: coach-only
create policy "coach_notes_all" on public.coach_notes for all
  using (public.is_coach()) with check (public.is_coach());

-- channels / channel_formations: read per can_view_channel, write coach-only
create policy "channels_select" on public.channels for select
  using (public.can_view_channel(id));
create policy "channels_write" on public.channels for all
  using (public.is_coach()) with check (public.is_coach());

create policy "channel_formations_select" on public.channel_formations for select
  using (public.can_view_channel(channel_id));
create policy "channel_formations_write" on public.channel_formations for all
  using (public.is_coach()) with check (public.is_coach());

-- posts: read if channel visible; insert if channel allows posting (or coach)
create policy "posts_select" on public.posts for select
  using (public.can_view_channel(channel_id));
create policy "posts_insert" on public.posts for insert
  with check (
    author_id = auth.uid()
    and public.can_view_channel(channel_id)
    and (
      public.is_coach()
      or exists (
        select 1 from public.channels c where c.id = channel_id and c.post_permission = 'all'
      )
    )
  );

-- documents: learner reads own/formation-wide/general, coach full
create policy "documents_select" on public.documents for select
  using (
    public.is_coach()
    or learner_id = auth.uid()
    or (formation_id is not null and public.is_enrolled(formation_id))
    or (formation_id is null and learner_id is null)
  );
create policy "documents_write" on public.documents for all
  using (public.is_coach()) with check (public.is_coach());

-- payments: learner reads own, coach full (manual status updates only — no Stripe in Phase 1)
create policy "payments_select" on public.payments for select
  using (learner_id = auth.uid() or public.is_coach());
create policy "payments_write" on public.payments for all
  using (public.is_coach()) with check (public.is_coach());

-- attachments: read per can_view_attachment, write coach-only
create policy "attachments_select" on public.attachments for select
  using (public.can_view_attachment(owner_type, owner_id));
create policy "attachments_write" on public.attachments for all
  using (public.is_coach()) with check (public.is_coach());

-- =========================================================================
-- Storage bucket for chapter/exercise/document files
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

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

create policy "files_write_coach" on storage.objects for insert
  with check (bucket_id = 'files' and public.is_coach());
create policy "files_update_coach" on storage.objects for update
  using (bucket_id = 'files' and public.is_coach());
create policy "files_delete_coach" on storage.objects for delete
  using (bucket_id = 'files' and public.is_coach());
