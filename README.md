# CareerSignal

**Measure the opportunities behind your visibility.**

[![CI](https://github.com/Worof/careersignal/actions/workflows/ci.yml/badge.svg)](https://github.com/Worof/careersignal/actions/workflows/ci.yml)
[![E2E](https://github.com/Worof/careersignal/actions/workflows/e2e.yml/badge.svg)](https://github.com/Worof/careersignal/actions/workflows/e2e.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

CareerSignal is a career-intelligence SaaS for people using LinkedIn to find work. Likes and impressions don't tell you
whether the right people are watching, so CareerSignal compares **who your content actually reaches** with **who you want
to reach** (roles, industries, companies, seniority, locations) and tracks the **opportunities** that follow.

> **Product hypothesis (to be tested with real users):** for job seekers, audience relevance and qualified professional
> interactions are more useful performance signals than engagement alone. Engagement is not treated as meaningless — it's
> interpreted in the context of each user's goals.

## What it does

| Module | Highlights |
|---|---|
| **Auth & onboarding** | Supabase Auth (SSR), protected routes, resumable 7-step onboarding that can't create duplicate profiles |
| **Analytics import** | Manual entry (nullable metrics — *missing ≠ 0*), screenshot upload with AI extraction **and a mandatory review step**, CSV importer designed (not yet exposed) |
| **Dashboard** | Visibility · Audience fit · Professional intent · Career outcomes, period-over-period comparison, 7 charts, honest empty states |
| **Audience Intelligence** | Per-dimension match against your targets, per-period (never merged), data-coverage indicator, visible matching assumptions |
| **Career Audience Fit Score** | Pure TypeScript, configurable weights + synonyms, renormalised over available dimensions, low-confidence/insufficient-data states |
| **Content Intelligence** | Posts with per-period metric snapshots, per-post audience fit, deterministic data-grounded takeaways |
| **Opportunity tracker** | Lightweight CRM, pipeline view, filters, DB-recorded status history, user-reported attribution |
| **AI insights** | Provider-independent, structured JSON + Zod validation, **number guard rejects statistics not in the input**, persisted with model + prompt version |
| **Settings** | Profile/avatar, scoring weights & synonyms, safe account deletion |

### Principles baked into the code
- **No fabricated data.** Missing metrics are `NULL` and render as "—" / "unavailable". Demo data exists only as an opt-in SQL function.
- **AI never does arithmetic.** All scores and comparisons are deterministic, unit-tested functions. AI explains; it doesn't calculate.
- **The app works with no AI key.** Manual entry, CRUD, dashboards and the Fit Score are independent of any provider.
- **No scraping.** No cookies, hidden endpoints or browser automation. An official-API seam exists but is disabled.
- **Attribution is user-reported.** CareerSignal never claims a post *caused* an interview.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS · Supabase (Postgres, Auth, Storage, RLS) · Recharts ·
Zod · Vitest · Playwright · Vercel. A single modular monolith — no microservices.

## Quick start

**Prerequisites:** Node 20.9+ (22 recommended), Docker (for local Supabase), a GitHub account.

```bash
git clone https://github.com/Worof/careersignal.git
cd careersignal
npm install

# 1. Start local Supabase (applies supabase/migrations automatically)
npx supabase start            # prints API URL + publishable/anon key

# 2. Configure the app
cp .env.example .env.local    # then paste the URL and key from step 1

# 3. Run
npm run dev                   # http://localhost:3000
```

Local email confirmation is disabled in `supabase/config.toml`, so you can sign up and use the app immediately.

### Optional: demo data (development only)
Everything in `supabase/seed.sql` is fictional and labelled `DEMO DATA`. It is never inserted automatically:

```sql
-- Supabase Studio → SQL editor (http://127.0.0.1:54323), after signing up:
select public.seed_demo_data('<your-user-uuid>');
```

The scenario: engagement **declining** across three periods while audience relevance and qualified interactions **increase**.

### Optional: AI features
Set `ANTHROPIC_API_KEY` (and optionally `AI_MODEL`) in `.env.local`. Without it, screenshot upload still works (you type the values
while viewing the image) and the Insights page explains that AI is off.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Publishable/anon key — safe in the browser because RLS protects every table and bucket |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | **Server only.** Used solely by `/api/account/delete`. Omit to disable account deletion |
| `NEXT_PUBLIC_SITE_URL` | ❌ | Used for auth e-mail redirects |
| `AI_PROVIDER` / `ANTHROPIC_API_KEY` / `AI_MODEL` | ❌ | Enables screenshot extraction and insights |
| `LINKEDIN_API_ENABLED` | ❌ | Keep `false`; see `docs/ARCHITECTURE.md` |

## Scripts

```bash
npm run dev          # dev server
npm run check        # lint + typecheck + unit tests
npm test             # Vitest unit tests
npm run test:e2e     # Playwright (public specs run without a backend)
npm run build        # production build
npm run db:reset     # re-apply migrations + seed to the local DB
```

Database isolation tests (real Postgres, two users):

```bash
npx supabase start
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/database/rls_isolation.sql
```

## Deploying

1. **Supabase (production):** create a *separate* project from development. Run `supabase link --project-ref <ref>` then
   `supabase db push`, or use the manual **Deploy · production migrations** workflow. In *Authentication → URL configuration*, add your Vercel URL and
   `https://<your-domain>/auth/callback` + `/reset-password`. **Turn email confirmations ON.**
2. **Vercel:** import the repo. Add the env vars above to **Production**, **Preview** and **Development** separately (use the dev Supabase project for Preview).
   Every PR gets a preview deployment; `main` deploys to production.
3. **GitHub:** protect `main` (require the `CI` checks). Create a `production` environment with required reviewers and add the secrets
   `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` for the migration workflow.

```
GitHub repo → local dev (dev Supabase) → push → Vercel preview + CI → QA → merge to main → Vercel production
                                                                         └─ manual: migrations to prod Supabase
```

## Project structure

```
app/            Next.js routes: (marketing) (auth) (onboarding) (dashboard) api/ auth/
components/     ui/ layout/ forms/ analytics/ audience/ content/ opportunities/ insights/ dashboard/
lib/
  calculations/ engagement · audience-fit · conversion · trends · aggregate · content-insights  (pure, tested)
  services/     data access + orchestration (analytics, audience, content, opportunity, upload, insight, report)
  ai/           provider interface · Anthropic provider · prompts · number guard
  supabase/     browser / server / middleware / admin clients
  validations/  Zod schemas      integrations/ official-LinkedIn seam (disabled)
supabase/       migrations/ · seed.sql (demo, opt-in) · tests/database/rls_isolation.sql
tests/          unit/ · e2e/      docs/ architecture, schema, security, roadmap
```

## Verification status — read this

What has actually been run, and what hasn't:

| Check | Status |
|---|---|
| ESLint (0 errors) · `tsc --strict` (0 errors) | ✅ run |
| Unit tests — calculations, validation, AI guards, upload sniffing, privacy boundary | ✅ 89 passing |
| Production build (`next build`, 24 routes) | ✅ run |
| SQL migrations applied to a real **PostgreSQL 16** (with stubbed `auth`/`storage` schemas) | ✅ run |
| RLS isolation test: two users, cross-user reads/writes/FK-injection/ownership transfer/anon/storage — plus mutation checks proving the test fails when a policy is removed | ✅ run |
| Built server smoke test: public pages 200, 8 protected routes redirect, API routes 401 anonymous, security headers | ✅ run |
| **Playwright E2E** | ⚠️ written, **not executed** by the author (no browser available) — runs in CI |
| **Real Supabase Auth / Storage / email flows**, Supabase CLI `db reset` | ⚠️ not executed — covered by the CI `database` and `full-journey` jobs |
| **AI calls with a real key** (vision extraction, insights) | ⚠️ not executed — logic is unit-tested against a fake provider |
| Vercel deployment | ⚠️ not executed |

Treat the first CI run as the real integration test and expect to fix small things.

## Known limitations
- One career-goal set per user (`unique(user_id)`); multiple saved goal sets are a later feature.
- CSV import and the official LinkedIn API are designed (`lib/services/csv-import.ts`, `lib/integrations/linkedin.ts`) but not wired to the UI.
- Dashboard visibility totals use only *profile analytics* and *search appearances* snapshots so per-post and demographic uploads never double-count.
  "Members reached" summed across periods can count the same person more than once.
- LinkedIn audience data is aggregated and partial; every audience view says so.
- Screenshot uploads are limited to 4 MB (Vercel's request-body limit). Rate limits are database-backed (20 uploads / 10 insights per hour).
- Component tests cover shared UI primitives and the Fit card; page-level behaviour is covered by Playwright (CI).

## Documentation
[`docs/PRODUCT_REQUIREMENTS.md`](docs/PRODUCT_REQUIREMENTS.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) ·
[`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) · [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) ·
[`docs/SECURITY.md`](docs/SECURITY.md) · [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md)

## License
[MIT](LICENSE) © 2026 Worof Ahmed. CareerSignal is independent and not affiliated with or endorsed by LinkedIn.
