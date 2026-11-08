# Contributing

1. `npm install`, `npx supabase start`, copy `.env.example` → `.env.local`.
2. Branch from `main`; keep changes focused.
3. Run `npm run check` before pushing. CI also runs the build, the database RLS test and Playwright.
4. Database changes go in a **new** file under `supabase/migrations/` — never edit an applied migration and never change schema by hand in the dashboard.
   Every new user-owned table needs RLS with four separate policies and a case in `supabase/tests/database/rls_isolation.sql`.
5. Calculations belong in `lib/calculations/` as pure functions with unit tests. Missing values are `null`, never `0`.
6. Anything sent to an AI provider must be built in `lib/services/insight-input.ts` and covered by the privacy-boundary test.
