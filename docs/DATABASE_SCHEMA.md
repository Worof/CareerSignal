# Database schema

Source of truth: `supabase/migrations/`. Never change schema by hand in the dashboard.

## Entity relationships
```
auth.users ─┬─ profiles (1:1, id = user id)
            ├─ user_preferences (1:1)
            ├─ career_goals (1:1 in MVP)
            ├─ upload_jobs ──────────────┐ (1:0..1)
            ├─ analytics_snapshots ◀─────┘ upload_job_id (unique)
            │        └─< audience_segments (analytics_snapshot_id)
            ├─ posts ─┬─< post_metrics
            │         └─< audience_segments (post_id)
            ├─ opportunities ─< opportunity_events (trigger-written)
            └─ insights
```
Every user-owned table has `user_id → auth.users ON DELETE CASCADE`, so deleting the auth user removes all of the person's rows.

## Tables
| Table | Purpose | Key constraints |
|---|---|---|
| `profiles` | Name, avatar path, timezone, onboarding state | `id` = auth user id; `onboarding_step` 0–7 |
| `career_goals` | Objectives, targets, `scoring_weights`, `synonyms` | `unique(user_id)`; weights must contain all 5 keys |
| `analytics_snapshots` | One reporting period of one data type | metrics `NULL`able, ≥ 0 (growth may be negative); `unique(user_id, source_type, start, end)`; `unique(upload_job_id)`; end ≥ start |
| `audience_segments` | Aggregate demographics | exactly one parent (snapshot **or** post); `percentage numeric(5,2)` 0–100; needs a percentage or a count |
| `posts` / `post_metrics` | Content and per-period performance | URL must be http(s); `unique(post_id, start, end)` |
| `opportunities` | Career CRM | enum-checked type/status/attribution; `is_relevant` |
| `opportunity_events` | Status history | written only by a `SECURITY DEFINER` trigger; users can read/delete, not insert |
| `upload_jobs` | Screenshot workflow | status enum; size ≤ 4 MB; MIME allow-list |
| `insights` | AI output | stores model, prompt version, evidence JSON, period |
| `user_preferences` | Settings | `unique(user_id)` |

**Provenance:** `analytics_snapshots`, `audience_segments` and `post_metrics` carry `data_source` (`manual` · `screenshot` · `csv` · `linkedin_api`).

JSONB is used only for genuinely schemaless data (weights, synonyms, AI evidence, extraction payloads) — never for relationships.

## Indexes
`user_id` on all owned tables plus the reporting columns: `(user_id, reporting_period_end desc)`, `(user_id, published_at desc)`, `(user_id, received_at desc)`,
`(user_id, status)`, `(post_id, reporting_period_end desc)`, partial indexes on segment parents, `(user_id, created_at desc)` for uploads and insights.

## Triggers & functions
`set_updated_at` · `handle_new_user` (profile + preferences on signup) · `log_opportunity_event` · `snapshot_upload_owner_check` ·
`seed_demo_data(uuid)` (dev-only; execute revoked from every app role).

## Row Level Security
- Enabled on all 11 tables. Separate SELECT / INSERT / UPDATE / DELETE policies per table; UPDATE has both `USING` and `WITH CHECK`, so a row can't be handed to another user.
- Child tables (`audience_segments`, `post_metrics`) additionally verify in `WITH CHECK` that the referenced parent belongs to the caller — a guessed foreign UUID is rejected.
- `anon` has all table privileges revoked.
- Storage: private buckets `analytics-uploads` and `avatars`; policies require `(storage.foldername(name))[1] = auth.uid()::text` for every command.
- `supabase/tests/database/rls_isolation.sql` asserts all of the above with two users, and was verified to **fail** when a policy is removed.
