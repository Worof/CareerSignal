-- CareerSignal — initial schema
-- Every user-owned table has RLS enabled with separate SELECT / INSERT / UPDATE / DELETE policies.
-- Metric columns are NULLable on purpose: a missing value is never stored as zero.

------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

------------------------------------------------------------------------
-- profiles
------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,                                  -- storage path inside the "avatars" bucket
  timezone text not null default 'UTC',
  onboarding_completed boolean not null default false,
  onboarding_step smallint not null default 0 check (onboarding_step between 0 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

------------------------------------------------------------------------
-- career_goals  (one active goal set per user in the MVP)
------------------------------------------------------------------------
create table public.career_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_types text[] not null default '{}',
  target_job_titles text[] not null default '{}',
  target_industries text[] not null default '{}',
  target_companies text[] not null default '{}',
  target_seniority text[] not null default '{}',
  target_locations text[] not null default '{}',
  scoring_weights jsonb not null default '{"job_titles":35,"industries":25,"companies":20,"seniority":15,"locations":5}'::jsonb,
  synonyms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_goals_one_per_user unique (user_id),
  constraint career_goals_weights_shape check (
    jsonb_typeof(scoring_weights) = 'object'
    and scoring_weights ?& array['job_titles','industries','companies','seniority','locations']
  ),
  constraint career_goals_synonyms_shape check (jsonb_typeof(synonyms) = 'object')
);

------------------------------------------------------------------------
-- upload_jobs  (created before analytics_snapshots, which references it)
------------------------------------------------------------------------
create table public.upload_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp')),
  file_size integer not null check (file_size > 0 and file_size <= 4194304),
  source_type text check (source_type in ('profile_analytics','search_appearances','audience_demographics','follower_demographics','post_analytics')),
  processing_status text not null default 'pending'
    check (processing_status in ('pending','processing','awaiting_review','completed','failed')),
  extracted_data jsonb,
  extraction_confidence text check (extraction_confidence in ('low','medium','high')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

------------------------------------------------------------------------
-- analytics_snapshots
------------------------------------------------------------------------
create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null
    check (source_type in ('profile_analytics','search_appearances','audience_demographics','follower_demographics','post_analytics')),
  data_source text not null default 'manual' check (data_source in ('manual','screenshot','csv','linkedin_api')),
  upload_job_id uuid references public.upload_jobs (id) on delete set null,
  reporting_period_start date not null,
  reporting_period_end date not null,
  impressions integer check (impressions >= 0),
  members_reached integer check (members_reached >= 0),
  profile_views integer check (profile_views >= 0),
  search_appearances integer check (search_appearances >= 0),
  total_followers integer check (total_followers >= 0),
  follower_growth integer,                          -- may legitimately be negative
  reactions integer check (reactions >= 0),
  comments integer check (comments >= 0),
  reposts integer check (reposts >= 0),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint snapshots_period_order check (reporting_period_end >= reporting_period_start),
  -- Prevents silent duplicate imports of the same period + source type.
  constraint snapshots_unique_period unique (user_id, source_type, reporting_period_start, reporting_period_end),
  -- A screenshot upload can only be imported once.
  constraint snapshots_unique_upload unique (upload_job_id)
);

------------------------------------------------------------------------
-- posts / post_metrics
------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  post_url text check (post_url is null or post_url ~* '^https?://'),
  post_text text check (char_length(post_text) <= 10000),
  content_type text not null default 'text'
    check (content_type in ('text','image','carousel','video','article','poll','other')),
  topics text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  reporting_period_start date not null,
  reporting_period_end date not null,
  impressions integer check (impressions >= 0),
  reactions integer check (reactions >= 0),
  comments integer check (comments >= 0),
  reposts integer check (reposts >= 0),
  clicks integer check (clicks >= 0),
  profile_activity integer check (profile_activity >= 0),
  data_source text not null default 'manual' check (data_source in ('manual','screenshot','csv','linkedin_api')),
  created_at timestamptz not null default now(),
  constraint post_metrics_period_order check (reporting_period_end >= reporting_period_start),
  constraint post_metrics_unique_period unique (post_id, reporting_period_start, reporting_period_end)
);

------------------------------------------------------------------------
-- audience_segments  (belongs to exactly one snapshot OR one post)
------------------------------------------------------------------------
create table public.audience_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  analytics_snapshot_id uuid references public.analytics_snapshots (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  dimension text not null check (dimension in ('job_title','industry','company','seniority','location')),
  segment_name text not null check (char_length(segment_name) between 1 and 200),
  member_count integer check (member_count >= 0),
  percentage numeric(5,2) check (percentage >= 0 and percentage <= 100),
  is_estimated boolean not null default false,
  data_source text not null default 'manual' check (data_source in ('manual','screenshot','csv','linkedin_api')),
  created_at timestamptz not null default now(),
  constraint segments_single_parent check (num_nonnulls(analytics_snapshot_id, post_id) = 1),
  constraint segments_has_value check (num_nonnulls(member_count, percentage) >= 1)
);

------------------------------------------------------------------------
-- opportunities (+ history)
------------------------------------------------------------------------
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 200),
  contact_name text check (char_length(contact_name) <= 200),
  contact_role text check (char_length(contact_role) <= 200),
  opportunity_type text not null check (opportunity_type in (
    'recruiter_inquiry','hr_contact','hiring_manager_contact','interview_invitation','referral',
    'networking_conversation','connection_request','freelance_inquiry','collaboration','job_offer')),
  related_job_title text check (char_length(related_job_title) <= 200),
  received_at date not null default current_date,
  source text check (char_length(source) <= 200),
  attribution_source text not null default 'unknown' check (attribution_source in (
    'linkedin_post','linkedin_search','profile_discovery','direct_message','mutual_connection',
    'external_referral','previous_relationship','job_application','unknown')),
  status text not null default 'new' check (status in (
    'new','contacted','conversation_started','interview_scheduled','interview_completed',
    'offer_received','accepted','rejected','closed','archived')),
  is_relevant boolean not null default true,
  notes text check (char_length(notes) <= 5000),
  last_interaction_at date,
  outcome_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  event_type text not null check (event_type in ('created','status_changed')),
  from_status text,
  to_status text,
  created_at timestamptz not null default now()
);

------------------------------------------------------------------------
-- insights / user_preferences
------------------------------------------------------------------------
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  insight_type text not null check (insight_type in (
    'weekly_summary','audience_relevance','engagement_vs_impact','content_recommendations','positioning','historical_comparison')),
  title text not null,
  description text not null,
  recommendation text,
  evidence jsonb not null default '{}'::jsonb,
  model_name text not null,
  prompt_version text not null,
  status text not null default 'active' check (status in ('active','archived')),
  reporting_period_start date,
  reporting_period_end date,
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  notification_preferences jsonb not null default '{}'::jsonb,
  dashboard_preferences jsonb not null default '{}'::jsonb,
  preferred_reporting_period text not null default '30d' check (preferred_reporting_period in ('7d','30d','90d','6m')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

------------------------------------------------------------------------
-- Indexes
------------------------------------------------------------------------
create index idx_upload_jobs_user on public.upload_jobs (user_id, created_at desc);
create index idx_snapshots_user_period on public.analytics_snapshots (user_id, reporting_period_end desc);
create index idx_posts_user_published on public.posts (user_id, published_at desc);
create index idx_post_metrics_user on public.post_metrics (user_id);
create index idx_post_metrics_post on public.post_metrics (post_id, reporting_period_end desc);
create index idx_segments_user on public.audience_segments (user_id);
create index idx_segments_snapshot on public.audience_segments (analytics_snapshot_id) where analytics_snapshot_id is not null;
create index idx_segments_post on public.audience_segments (post_id) where post_id is not null;
create index idx_opportunities_user_received on public.opportunities (user_id, received_at desc);
create index idx_opportunities_user_status on public.opportunities (user_id, status);
create index idx_opp_events_opportunity on public.opportunity_events (opportunity_id, created_at);
create index idx_insights_user_created on public.insights (user_id, created_at desc);

------------------------------------------------------------------------
-- updated_at triggers
------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','career_goals','upload_jobs','analytics_snapshots','posts','opportunities','user_preferences']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

------------------------------------------------------------------------
-- Opportunity history (system-written, so users cannot forge events)
------------------------------------------------------------------------
create or replace function public.log_opportunity_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.opportunity_events (user_id, opportunity_id, event_type, to_status)
    values (new.user_id, new.id, 'created', new.status);
  elsif new.status is distinct from old.status then
    insert into public.opportunity_events (user_id, opportunity_id, event_type, from_status, to_status)
    values (new.user_id, new.id, 'status_changed', old.status, new.status);
  end if;
  return new;
end;
$$;
revoke execute on function public.log_opportunity_event() from public, anon, authenticated;

create trigger log_opportunity_event
after insert or update of status on public.opportunities
for each row execute function public.log_opportunity_event();

------------------------------------------------------------------------
-- New-user bootstrap: profile + preferences
------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.career_goals enable row level security;
alter table public.upload_jobs enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.posts enable row level security;
alter table public.post_metrics enable row level security;
alter table public.audience_segments enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_events enable row level security;
alter table public.insights enable row level security;
alter table public.user_preferences enable row level security;

-- profiles: the row id IS the user id. Profiles are created by trigger, so no INSERT policy for users.
create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);

-- Simple owner tables: separate policy per command. UPDATE checks both the old and the new row.
do $$
declare t text;
begin
  foreach t in array array['career_goals','upload_jobs','analytics_snapshots','posts','opportunities','insights','user_preferences']
  loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t || '_delete_own', t);
  end loop;
end $$;

-- opportunity_events: read + delete only; rows are written by the trigger above.
create policy opportunity_events_select_own on public.opportunity_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy opportunity_events_delete_own on public.opportunity_events for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Child tables: owner check PLUS proof that the referenced parent also belongs to the caller.
-- This blocks attaching your rows to another user's snapshot/post by guessing a UUID.
create policy post_metrics_select_own on public.post_metrics for select to authenticated
  using ((select auth.uid()) = user_id);
create policy post_metrics_insert_own on public.post_metrics for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid()))
  );
create policy post_metrics_update_own on public.post_metrics for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid()))
  );
create policy post_metrics_delete_own on public.post_metrics for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy audience_segments_select_own on public.audience_segments for select to authenticated
  using ((select auth.uid()) = user_id);
create policy audience_segments_insert_own on public.audience_segments for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (analytics_snapshot_id is null or exists (
      select 1 from public.analytics_snapshots s where s.id = analytics_snapshot_id and s.user_id = (select auth.uid())))
    and (post_id is null or exists (
      select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid())))
  );
create policy audience_segments_update_own on public.audience_segments for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (analytics_snapshot_id is null or exists (
      select 1 from public.analytics_snapshots s where s.id = analytics_snapshot_id and s.user_id = (select auth.uid())))
    and (post_id is null or exists (
      select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid())))
  );
create policy audience_segments_delete_own on public.audience_segments for delete to authenticated
  using ((select auth.uid()) = user_id);

-- A snapshot may only reference an upload job owned by the same user.
create or replace function public.snapshot_upload_owner_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.upload_job_id is not null and not exists (
    select 1 from public.upload_jobs j where j.id = new.upload_job_id and j.user_id = new.user_id
  ) then
    raise exception 'upload_job_id does not belong to this user' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger snapshot_upload_owner_check before insert or update of upload_job_id, user_id
on public.analytics_snapshots for each row execute function public.snapshot_upload_owner_check();

-- Least privilege: the anon role never touches application tables.
revoke all on all tables in schema public from anon;
