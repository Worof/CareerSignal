## What & why

## Checklist
- [ ] `npm run check` passes (lint, typecheck, unit tests)
- [ ] New/changed tables have RLS enabled with SELECT / INSERT / UPDATE / DELETE policies, and `supabase/tests/database/rls_isolation.sql` covers them
- [ ] Missing metric values stay `NULL` (never coerced to 0)
- [ ] No secrets, service-role keys or personal data added to client code, logs or the AI prompt payload
- [ ] Docs updated (README / `docs/`) if behaviour or architecture changed
