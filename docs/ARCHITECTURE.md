# Architecture

## Shape: modular monolith
One Next.js app, one Supabase project, one Postgres database. No microservices, queues or caches. A Python analytics service
would only be justified if statistical processing outgrows TypeScript.

```
Browser ─▶ Next.js (RSC pages · Server Actions · Route Handlers)
              ├─▶ lib/services ─▶ Supabase (Postgres + RLS · Auth · Storage)   ← user's session, publishable key
              ├─▶ lib/calculations   (pure, deterministic, unit-tested)
              ├─▶ lib/ai ───────────▶ AI provider (optional; server-side only)
              └─▶ lib/validations (Zod)
Vercel hosts the app; Supabase hosts data/auth/files.
```

## Request security flow
1. `middleware.ts` refreshes the session and redirects unauthenticated users away from protected paths (`getUser()`, which revalidates with Supabase Auth).
2. Every Server Action / Route Handler calls `requireUser()` / `getUserOrNull()` again — middleware is a convenience, not the boundary.
3. Queries run with the **user's** session and publishable key, so Postgres RLS enforces isolation even if app code has a bug.
4. The service-role key exists in exactly one place (`lib/supabase/admin.ts`, used by `/api/account/delete`) after identity + typed confirmation.

## Data flow: screenshot import
`POST /api/uploads` → auth → DB rate limit → size + **magic-byte** validation → server-generated path `<uid>/analytics/<uuid>.<ext>` in a private bucket →
`upload_jobs` row → (optional) vision extraction → Zod validation → status `awaiting_review` →
review page (signed URL, editable form) → `confirmImportAction` creates the snapshot + segments (compensating delete on failure) → job `completed`.
The unique constraint on `analytics_snapshots.upload_job_id` guarantees a screenshot is imported once.

## Analytics model
- A *snapshot* is one reporting period of one data type (`profile_analytics`, `search_appearances`, `audience_demographics`, `follower_demographics`, `post_analytics`).
  Different types and periods are never merged. A unique constraint rejects duplicates.
- Dashboard visibility totals sum only `profile_analytics` + `search_appearances` snapshots **whose period ends in the range**; the comparison window is the immediately preceding
  period of identical length (`previousPeriod`). A metric no snapshot provided is `null`, rendered "—".
- Per-post demographics attach to a post; per-period demographics attach to a snapshot (`num_nonnulls(...) = 1` check).

## Audience Fit Score
`calculateAudienceFit()` in `lib/calculations/audience-fit.ts`:
1. For each dimension with targets *and* data: `matchRate = matched weight / total listed weight` (percentages preferred; counts if every row has one; units never mixed).
   Matching is exact → normalised text → configured synonyms, and each match records its type so the UI can show assumptions.
2. `score = Σ(wᵢ × rateᵢ) / Σ(wᵢ over contributing dimensions) × 100`.
3. Dimensions lacking targets or data are excluded, never zero. `coverage` is reported separately: usable dimensions ÷ targeted dimensions, and the share of configured weight covered.
   Below 50% weight coverage the status is `low_confidence`; with nothing usable it is `insufficient_data` and `score` is `null`.

## AI integration
- `AIProvider` interface (`completeText`) → `AnthropicProvider` (fetch, timeout, retry with backoff on 408/409/429/5xx/529). Add providers by implementing one method.
- `completeJSON` strips fences, parses, validates with Zod, and retries once with corrective feedback.
- **Privacy boundary:** only `buildInsightInput()` output is sent — aggregates + the user's own target lists. No contact names, companies, notes, post text, URLs or images (covered by a unit test).
- **No invented statistics:** `number-guard.ts` rejects generated text containing numbers absent from the input; rejected output triggers one retry, then an error.
- Output persists with `model_name`, `prompt_version` and the exact `input_summary` the model saw.
- Rate limits are counted in the database (works across serverless instances).

## Official LinkedIn API seam
`lib/integrations/linkedin.ts` defines `LinkedInAnalyticsSource`. The shipped implementation is disabled. If access is granted, implement the interface,
write rows with `data_source = 'linkedin_api'`, and set `LINKEDIN_API_ENABLED=true`. There is no scraping path.

## Environments
Local (Supabase CLI) · Preview (per PR, dev Supabase project) · Production (separate Supabase project). Migrations are applied to production by a manual,
approval-gated workflow after CI passes.
