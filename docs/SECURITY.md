# Security model

| Layer | Control |
|---|---|
| Identity | Supabase Auth (SSR cookies). Servers use `getUser()` (re-validates), never trust `getSession()` or client state |
| Authorization | Postgres RLS on every table; separate per-command policies; `WITH CHECK` prevents ownership transfer and cross-user FK injection |
| Files | Private buckets, per-user folder policies, server-generated object names, signed URLs (10 min) for display |
| Uploads | Size cap, magic-byte type check (client MIME/extension ignored), sanitised filename metadata, DB-backed rate limit |
| Secrets | Publishable key only in the browser. Service-role key used in one route, after identity + typed confirmation. AI key server-side only. `server-only` imports guard server modules |
| AI | Aggregates only (no contacts/notes/post text/URLs/images); prompts treat image/text as data not instructions; Zod-validated output; number guard; no secrets or response bodies in logs/errors |
| Redirects | `safeNext()` allows only same-origin relative paths |
| Headers | `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, restrictive permissions policy |
| Errors | DB errors mapped to safe messages; sign-in/reset responses don't reveal whether an account exists |
| Supply chain | Dependabot, CodeQL, lockfile installs (`npm ci`) |

## Verified vs. assumed
Verified locally on PostgreSQL 16: RLS isolation (reads, updates, deletes, forged inserts, ownership transfer, cross-user parent references, anon, storage prefixes),
cascade deletion, and that the test fails when a policy is removed. Verified by unit test: upload signature checks, redirect safety, AI privacy boundary.
**Not yet verified end-to-end:** real Supabase Auth/Storage behaviour and the browser flows (CI jobs `database` and `full-journey` do this).

## Known gaps / production checklist
- Turn **email confirmations ON** in production Supabase (they're off in local config for convenience).
- Add Supabase Auth rate-limit and CAPTCHA settings for sign-up/sign-in abuse.
- A strict Content-Security-Policy is not set yet (Next.js inline scripts need nonces); add via middleware before launch.
- Insight/upload rate limits are per-user hourly counts, not IP-based.
- Enable GitHub secret scanning and branch protection on `main`.

Report vulnerabilities privately — see the root `SECURITY.md`.
