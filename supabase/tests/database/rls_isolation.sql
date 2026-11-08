-- RLS isolation test. Plain SQL with ON_ERROR_STOP: any failed assertion aborts with an exception.
-- Run:  psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/database/rls_isolation.sql
-- It creates two throw-away users and cleans up after itself.

\set ON_ERROR_STOP on

create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'ASSERTION FAILED: %', msg; end if;
end $$;

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
end $$;

begin;

insert into auth.users (id, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '{"full_name":"Alice"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '{"full_name":"Bob"}');

-- Bootstrap trigger created profile + preferences for both users
select pg_temp.assert((select count(*) = 2 from public.profiles where id in ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002')), 'profiles bootstrapped');
select pg_temp.assert((select count(*) = 2 from public.user_preferences where user_id in ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002')), 'preferences bootstrapped');

-- ───────── Alice creates data ─────────
set local role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');

insert into public.career_goals (user_id, target_job_titles) values ('aaaaaaaa-0000-0000-0000-000000000001', '{Data Scientist}');
insert into public.analytics_snapshots (id, user_id, source_type, reporting_period_start, reporting_period_end, impressions)
  values ('a1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'profile_analytics', '2026-10-01', '2026-10-31', 1000);
insert into public.posts (id, user_id, title) values ('a2000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Alice post');
insert into public.audience_segments (user_id, analytics_snapshot_id, dimension, segment_name, percentage)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'job_title', 'Recruiter', 12.5);
insert into public.opportunities (id, user_id, company_name, opportunity_type)
  values ('a3000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Acme', 'recruiter_inquiry');
update public.opportunities set status = 'contacted' where id = 'a3000000-0000-0000-0000-000000000001';
insert into public.insights (user_id, insight_type, title, description, model_name, prompt_version)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'weekly_summary', 't', 'd', 'm', 'v1');

select pg_temp.assert((select count(*) = 2 from public.opportunity_events), 'history logged: created + status_changed');
select pg_temp.assert((select count(*) = 1 from public.analytics_snapshots), 'alice sees her snapshot');

-- Duplicate period is rejected (no silent duplicate import)
do $$ begin
  begin
    insert into public.analytics_snapshots (user_id, source_type, reporting_period_start, reporting_period_end)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'profile_analytics', '2026-10-01', '2026-10-31');
    raise exception 'ASSERTION FAILED: duplicate period accepted';
  exception when unique_violation then null; end;
end $$;

-- Users cannot forge history events
do $$ begin
  begin
    insert into public.opportunity_events (user_id, opportunity_id, event_type)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'created');
    raise exception 'ASSERTION FAILED: forged history event accepted';
  exception when insufficient_privilege then null; end;
end $$;

-- ───────── Bob cannot see or touch Alice's data ─────────
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');

select pg_temp.assert((select count(*) = 0 from public.career_goals), 'bob sees no goals');
select pg_temp.assert((select count(*) = 0 from public.analytics_snapshots), 'bob sees no snapshots');
select pg_temp.assert((select count(*) = 0 from public.posts), 'bob sees no posts');
select pg_temp.assert((select count(*) = 0 from public.audience_segments), 'bob sees no segments');
select pg_temp.assert((select count(*) = 0 from public.opportunities), 'bob sees no opportunities');
select pg_temp.assert((select count(*) = 0 from public.opportunity_events), 'bob sees no history');
select pg_temp.assert((select count(*) = 0 from public.insights), 'bob sees no insights');
select pg_temp.assert((select count(*) = 1 from public.profiles), 'bob sees only his profile');

-- UPDATE / DELETE against Alice's UUIDs affect zero rows
with u as (update public.posts set title = 'hacked' where id = 'a2000000-0000-0000-0000-000000000001' returning 1)
select pg_temp.assert((select count(*) = 0 from u), 'bob cannot update alice post');
with d as (delete from public.opportunities where id = 'a3000000-0000-0000-0000-000000000001' returning 1)
select pg_temp.assert((select count(*) = 0 from d), 'bob cannot delete alice opportunity');

-- Bob cannot insert rows owned by Alice
do $$ begin
  begin
    insert into public.posts (user_id, title) values ('aaaaaaaa-0000-0000-0000-000000000001', 'forged');
    raise exception 'ASSERTION FAILED: bob inserted a row as alice';
  exception when insufficient_privilege then null; end;
end $$;

-- Bob cannot attach his own rows to Alice's parent rows (cross-user foreign key)
do $$ begin
  begin
    insert into public.audience_segments (user_id, analytics_snapshot_id, dimension, segment_name, percentage)
      values ('bbbbbbbb-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'job_title', 'Injected', 50);
    raise exception 'ASSERTION FAILED: segment attached to alice snapshot';
  exception when insufficient_privilege then null; end;
end $$;
do $$ begin
  begin
    insert into public.post_metrics (user_id, post_id, reporting_period_start, reporting_period_end, impressions)
      values ('bbbbbbbb-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', '2026-10-01', '2026-10-31', 1);
    raise exception 'ASSERTION FAILED: metrics attached to alice post';
  exception when insufficient_privilege then null; end;
end $$;

-- Bob can create and own his own data
insert into public.posts (user_id, title) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Bob post');
select pg_temp.assert((select count(*) = 1 from public.posts), 'bob sees only his own post');

-- A user cannot move a row to another owner via UPDATE
do $$ begin
  begin
    update public.posts set user_id = 'aaaaaaaa-0000-0000-0000-000000000001' where title = 'Bob post';
    raise exception 'ASSERTION FAILED: ownership transfer via update allowed';
  exception when insufficient_privilege then null; end;
end $$;

-- anon role has no access at all
reset role;
set local role anon;
do $$ begin
  begin
    perform count(*) from public.posts;
    raise exception 'ASSERTION FAILED: anon can read posts';
  exception when insufficient_privilege then null; end;
end $$;

-- ───────── Storage policies ─────────
reset role;
insert into storage.objects (bucket_id, name) values
  ('analytics-uploads', 'aaaaaaaa-0000-0000-0000-000000000001/analytics/a.png');

set local role authenticated;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.assert((select count(*) = 0 from storage.objects where bucket_id = 'analytics-uploads'), 'bob cannot list alice files');
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('analytics-uploads', 'aaaaaaaa-0000-0000-0000-000000000001/analytics/evil.png');
    raise exception 'ASSERTION FAILED: bob wrote into alice folder';
  exception when insufficient_privilege then null; end;
end $$;
insert into storage.objects (bucket_id, name) values ('analytics-uploads', 'bbbbbbbb-0000-0000-0000-000000000002/analytics/ok.png');

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.assert((select count(*) = 1 from storage.objects where bucket_id = 'analytics-uploads'), 'alice sees only her own file');

-- Cascade: deleting the auth user removes all of their data
reset role;
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.assert((select count(*) = 0 from public.posts where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'cascade removed alice posts');
select pg_temp.assert((select count(*) = 0 from public.opportunity_events where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'cascade removed alice history');

select 'RLS ISOLATION: ALL ASSERTIONS PASSED' as result;
rollback;
