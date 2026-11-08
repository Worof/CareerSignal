# API & service documentation

Most mutations are **Server Actions** (called by forms, not public HTTP). Two **Route Handlers** exist where an HTTP endpoint is needed.

## Route Handlers
### `POST /api/uploads`  — multipart, field `file`
Auth required (401 otherwise). Limits: 4 MB, PNG/JPEG/WEBP verified by magic bytes (415 otherwise), 20 uploads/hour/user (429). `maxDuration = 60`.
Response `200 { id, status: "awaiting_review" | "failed", error }`. The extracted data is **not** imported until the user confirms it on the review page.

### `POST /api/account/delete` — JSON `{ "confirm": "<your email>" }`
Auth required. 501 if `SUPABASE_SERVICE_ROLE_KEY` is unset; 400 if the typed email doesn't match. Deletes the user's storage objects, then the auth user
(all rows cascade). Uses the service-role client — the only place that does.

### `GET /auth/callback?code=…&next=/path`
Exchanges the auth code for a session. `next` must be a same-origin path (open-redirect protected by `safeNext`).

## Server Actions (by module)
| Module | Actions |
|---|---|
| Auth | `signInAction` `signUpAction` `signOutAction` `requestPasswordResetAction` `updatePasswordAction` |
| Onboarding / goals | `saveOnboardingAction` (idempotent upsert per step) |
| Analytics | `createSnapshotAction` `updateSnapshotAction` `deleteSnapshotAction` `createSegmentAction` `deleteSegmentAction` |
| Uploads | `confirmImportAction` `deleteUploadAction` `retryUploadAction` |
| Content | `createPostAction` `updatePostAction` `deletePostAction` `savePostMetricsAction` `deletePostMetricAction` |
| Opportunities | `createOpportunityAction` `updateOpportunityAction` `updateStatusAction` `deleteOpportunityAction` |
| Insights | `generateInsightAction` `archiveInsightAction` `deleteInsightAction` |
| Settings | `updateProfileAction` `uploadAvatarAction` `removeAvatarAction` `updateScoringAction` `resetScoringAction` |

Contract for every action: authenticate (`requireUser`) → validate with Zod → call a service → map DB errors to safe messages (`dbErrorMessage`) →
`revalidatePath("/", "layout")`. They return `ActionState { ok, error, message, fieldErrors, nonce }`.

## Services (`lib/services`)
`analytics` · `audience` · `content` · `opportunity` · `goals` · `upload` · `insight` · `report` (one shared data path for dashboard + insights) · `insight-input` (the AI privacy boundary) · `csv-import` (design only).

## Pure calculation API (`lib/calculations`)
| Function | Notes |
|---|---|
| `engagementRateByImpressions` | `((reactions+comments+reposts)/impressions)×100`; unavailable if any input is missing or impressions ≤ 0 |
| `comparePeriods` / `previousPeriod` | percent change with explicit zero/missing handling |
| `calculateAudienceFit` | see `ARCHITECTURE.md` |
| `qualifiedOpportunitiesPer1000` | observed-attribution metric; unavailable unless members reached + aligned periods |
| `aggregateVisibility` | null-safe sums; never double-counts source types |
| `contentTakeaways` | data-grounded observations; refuses to claim from thin data |
