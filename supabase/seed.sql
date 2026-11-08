-- ════════════════════════════════════════════════════════════════════
--  DEMO DATA — DEVELOPMENT ONLY. Everything inserted here is fictional.
--  This file only DEFINES a helper; it inserts nothing by itself, and the
--  function is not executable by app roles, so a normal user's live account
--  can never receive demo records.
--
--  Usage (local dev, as the postgres role, e.g. in Supabase Studio's SQL editor):
--     select public.seed_demo_data('<user-uuid>');
--
--  Scenario: engagement is DECLINING across three periods while identifiable
--  audience relevance and qualified professional interactions are INCREASING.
-- ════════════════════════════════════════════════════════════════════
create or replace function public.seed_demo_data(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  s3 uuid := gen_random_uuid();
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users where id = target_user) then
    raise exception 'user % not found', target_user;
  end if;

  insert into public.career_goals (user_id, goal_types, target_job_titles, target_industries, target_companies, target_seniority, target_locations)
  values (target_user, '{find_job,attract_recruiters}', '{Data Scientist,Machine Learning Engineer,AI Engineer}',
          '{Artificial Intelligence,Technology,SaaS}', '{Acme AI,Northwind Labs}', '{Recruiter,Hiring Manager,Team Lead}', '{Remote}')
  on conflict (user_id) do nothing;

  update public.profiles set onboarding_completed = true, onboarding_step = 7 where id = target_user;

  -- Three monthly periods: impressions and engagement fall, relevance rises.
  insert into public.analytics_snapshots (id, user_id, source_type, data_source, reporting_period_start, reporting_period_end,
    impressions, members_reached, profile_views, search_appearances, total_followers, follower_growth, reactions, comments, reposts, notes) values
    (s1, target_user, 'profile_analytics', 'manual', '2026-08-01', '2026-08-31', 14200, 8900, 210,  95, 1840, 60, 520, 61, 28, 'DEMO DATA'),
    (s2, target_user, 'profile_analytics', 'manual', '2026-09-01', '2026-09-30',  9800, 6100, 265, 140, 1895, 55, 301, 38, 15, 'DEMO DATA'),
    (s3, target_user, 'profile_analytics', 'manual', '2026-10-01', '2026-10-31',  6400, 4200, 340, 210, 1950, 55, 148, 22,  9, 'DEMO DATA');

  insert into public.audience_segments (user_id, analytics_snapshot_id, dimension, segment_name, percentage, is_estimated, data_source) values
    (target_user, s1, 'job_title', 'Marketing Manager', 35, false, 'manual'),
    (target_user, s1, 'job_title', 'Content Creator', 25, false, 'manual'),
    (target_user, s1, 'job_title', 'Software Engineer', 12, false, 'manual'),
    (target_user, s1, 'job_title', 'Recruiter', 5, false, 'manual'),
    (target_user, s1, 'industry', 'Marketing and Advertising', 48, false, 'manual'),
    (target_user, s1, 'industry', 'Technology', 20, false, 'manual'),
    (target_user, s2, 'job_title', 'Marketing Manager', 22, false, 'manual'),
    (target_user, s2, 'job_title', 'Software Engineer', 20, false, 'manual'),
    (target_user, s2, 'job_title', 'Recruiter', 9, false, 'manual'),
    (target_user, s2, 'job_title', 'Data Scientist', 8, false, 'manual'),
    (target_user, s2, 'industry', 'Marketing and Advertising', 31, false, 'manual'),
    (target_user, s2, 'industry', 'Technology', 34, false, 'manual'),
    (target_user, s3, 'job_title', 'Data Scientist', 18, false, 'manual'),
    (target_user, s3, 'job_title', 'Machine Learning Engineer', 15, false, 'manual'),
    (target_user, s3, 'job_title', 'Recruiter', 14, false, 'manual'),
    (target_user, s3, 'job_title', 'Marketing Manager', 10, false, 'manual'),
    (target_user, s3, 'industry', 'Artificial Intelligence', 29, false, 'manual'),
    (target_user, s3, 'industry', 'Technology', 38, false, 'manual'),
    (target_user, s3, 'industry', 'Marketing and Advertising', 14, false, 'manual'),
    (target_user, s3, 'seniority', 'Hiring Manager', 9, true, 'manual'),
    (target_user, s3, 'seniority', 'Team Lead', 12, true, 'manual'),
    (target_user, s3, 'seniority', 'Entry level', 40, true, 'manual');

  insert into public.posts (id, user_id, title, content_type, topics, published_at) values
    (p1, target_user, '[DEMO] General marketing commentary', 'text', '{marketing}', '2026-08-12 09:00+00'),
    (p2, target_user, '[DEMO] Project breakdown: churn model', 'carousel', '{machine learning,projects}', '2026-09-18 09:00+00'),
    (p3, target_user, '[DEMO] Building an RFM segmentation pipeline', 'article', '{data science,projects}', '2026-10-09 09:00+00');

  insert into public.post_metrics (user_id, post_id, reporting_period_start, reporting_period_end, impressions, reactions, comments, reposts, profile_activity) values
    (target_user, p1, '2026-08-12', '2026-08-31', 7600, 310, 40, 18, 22),
    (target_user, p2, '2026-09-18', '2026-09-30', 3900, 120, 19, 9, 61),
    (target_user, p3, '2026-10-09', '2026-10-31', 2800,  64, 11, 5, 88);

  insert into public.audience_segments (user_id, post_id, dimension, segment_name, percentage, data_source) values
    (target_user, p1, 'job_title', 'Marketing Manager', 40, 'manual'), (target_user, p1, 'job_title', 'Data Scientist', 4, 'manual'),
    (target_user, p3, 'job_title', 'Data Scientist', 26, 'manual'), (target_user, p3, 'job_title', 'Recruiter', 17, 'manual'),
    (target_user, p3, 'job_title', 'Marketing Manager', 8, 'manual');

  insert into public.opportunities (user_id, company_name, contact_role, opportunity_type, related_job_title, received_at, attribution_source, status, is_relevant, notes) values
    (target_user, 'Northwind Labs', 'Technical Recruiter', 'recruiter_inquiry', 'Data Scientist', '2026-09-14', 'profile_discovery', 'closed', true, 'DEMO DATA'),
    (target_user, 'Acme AI', 'Talent Partner', 'recruiter_inquiry', 'ML Engineer', '2026-10-03', 'linkedin_post', 'interview_scheduled', true, 'DEMO DATA'),
    (target_user, 'Acme AI', 'Head of Data', 'hiring_manager_contact', 'ML Engineer', '2026-10-11', 'linkedin_post', 'conversation_started', true, 'DEMO DATA'),
    (target_user, 'Globex', 'Recruiter', 'recruiter_inquiry', 'Marketing Analyst', '2026-10-15', 'linkedin_search', 'new', false, 'DEMO DATA'),
    (target_user, 'Initech SaaS', 'Team Lead', 'networking_conversation', null, '2026-10-20', 'mutual_connection', 'contacted', true, 'DEMO DATA'),
    (target_user, 'Northwind Labs', 'Data Lead', 'referral', 'Data Scientist', '2026-10-27', 'external_referral', 'new', true, 'DEMO DATA');
end;
$$;

revoke execute on function public.seed_demo_data(uuid) from public, anon, authenticated;
