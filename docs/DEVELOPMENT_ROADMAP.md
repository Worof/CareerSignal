# Development roadmap

## Implementation checklist
| Area | Status |
|---|---|
| Auth, profiles, onboarding | ✅ Completed |
| Schema, RLS, storage policies, isolation tests | ✅ Completed (verified on Postgres 16) |
| Manual analytics, dashboard, trends | ✅ Completed |
| Audience intelligence + Fit Score + tests | ✅ Completed |
| Content intelligence | ✅ Completed |
| Opportunity CRM | ✅ Completed |
| Screenshot ingestion + review | ✅ Completed (AI path untested against a live key) |
| AI insights | ✅ Completed (untested against a live key) |
| Settings, avatar, account deletion | ✅ Completed |
| CI / CD / E2E workflows | 🟡 Written; first CI run pending |
| CSV import UI | ⬜ Not started (interface designed) |
| Official LinkedIn API | ⬜ Blocked on API access (seam only) |
| Content-Security-Policy | ⬜ Not started |

## Versions
| Version | Focus | State |
|---|---|---|
| v0.1 | Auth, onboarding, schema, CRUD | ✅ |
| v0.2 | Analytics import + dashboard | ✅ |
| v0.3 | Audience Intelligence + Fit | ✅ |
| v0.4 | Content Intelligence | ✅ |
| v0.5 | Opportunity CRM + outcomes | ✅ |
| v0.6 | Screenshot extraction + AI insights | ✅ (needs live validation) |
| **v1.0** | QA on real data, security hardening (CSP, auth rate limits), production release | 🟡 next |

## After 1.0
CSV import with column mapping · multiple goal sets · weekly e-mail digests · cohort-aware recommendations once there's enough real-user data to test the product hypothesis ·
official LinkedIn API if approved · Python analytics service only if statistical needs justify it.
