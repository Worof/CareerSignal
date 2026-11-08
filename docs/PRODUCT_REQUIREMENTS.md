# Product Requirements — CareerSignal

## 1. Vision
Help professionals answer one question: **"Is my LinkedIn presence attracting the people who can help me achieve my professional goals?"**

## 2. Personas
| Persona | Goal | MVP priority |
|---|---|---|
| **Job seeker** (primary) | Attract recruiters and hiring managers | ✅ |
| Early-career professional | Become discoverable to relevant employers | Served by the same features |
| Experienced professional | Attract senior-level opportunities | Later |
| Freelancer / consultant | Attract clients | Later (goal types are stored) |
| Personal-brand builder | Build a relevant audience | Later |

## 3. User journeys
- **A. New user:** landing → sign up → 7-step onboarding → add first analytics → dashboard.
- **B. Manual import:** Add analytics → pick period + data type → enter available metrics → saved → dashboard recalculates.
- **C. Screenshot import:** upload → server validates (size, real image signature) → private storage → AI extraction (optional) → **user review & correction** → confirm → saved; each upload imports once.
- **D. Opportunity tracking:** add → choose type, attribution (user-reported), status → pipeline updates; history is recorded by the database.
- **E. Insight:** choose type + period → deterministic metrics computed → aggregates sent to AI → validated JSON → stored → review / archive / delete.

## 4. Functional requirements (summary → implementation)
| ID | Requirement | Where |
|---|---|---|
| FR-1 | Register, sign in/out, reset password, persistent sessions, protected routes | `app/(auth)`, `middleware.ts`, `lib/auth.ts` |
| FR-2 | Resumable onboarding storing objectives/targets without duplicates | `app/(onboarding)`, `career_goals unique(user_id)` |
| FR-3 | Manual analytics with nullable metrics | `components/analytics/snapshot-form.tsx`, `analytics_snapshots` |
| FR-4 | Screenshot upload → extraction → review → import | `app/api/uploads`, `lib/services/upload.service.ts`, review page |
| FR-5 | Dashboard: Visibility, Audience fit, Intent, Outcomes + 7 visualisations + date filters | `app/(dashboard)/dashboard` |
| FR-6 | Audience intelligence across 5 dimensions with coverage + history | `app/(dashboard)/audience` |
| FR-7 | Transparent, configurable Career Audience Fit Score | `lib/calculations/audience-fit.ts` |
| FR-8 | Post management with per-period metric snapshots and comparison | `app/(dashboard)/content` |
| FR-9 | Opportunity CRM with pipeline, filters, history | `app/(dashboard)/opportunities` |
| FR-10 | AI insights, validated, persisted, with evidence | `lib/services/insight.service.ts` |
| FR-11 | Settings, avatar, scoring weights/synonyms, account deletion | `app/(dashboard)/settings`, `app/api/account/delete` |
| FR-12 | Full CRUD persisted to Supabase for every entity | `app/(dashboard)/**/actions.ts` |

## 5. Non-functional requirements
- **Security:** RLS everywhere, private buckets, server-side authz on every mutation, no secrets in the browser. See `SECURITY.md`.
- **Data integrity:** unique period constraints prevent duplicate imports; compensating delete if a multi-step import fails; UTC storage.
- **Honesty:** never fabricate metrics, demographics or causation; unavailable ≠ zero; always show coverage and limitations.
- **Resilience:** the app is fully usable without an AI key; AI failures never break other features.
- **Accessibility:** labelled forms, keyboard-operable dialogs/menus, charts have text summaries, no colour-only meaning, reduced-motion support.
- **Performance:** Server Components by default; selected columns/limits on queries; indexes on `user_id` and date columns.

## 6. Out of scope for the MVP
Scraping or unofficial LinkedIn access · identifying anonymous profile viewers · team/multi-user workspaces · billing · native mobile apps ·
automatic CSV import UI · official LinkedIn API integration (seam only) · ML classification of audience segments.

## 7. Acceptance criteria
The 21 criteria in the original specification map to: auth (1), onboarding (2), manual analytics + persistence (3–4), dashboard from real data (5–6),
demographics (7), tested Fit Score + coverage (8–9), post and opportunity CRUD (10–11), secure uploads (12), review-before-import (13), persisted insights (14),
missing data (15), isolation of rows and files (16–17), no browser secrets (18), responsive (19), checks pass (20), reproducible setup (21).
Verification status per criterion is in the README.
