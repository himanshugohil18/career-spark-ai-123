# Production Stabilization Plan

Treat the app as one pipeline with a single source of truth:

```text
Resume (parsed) → Career Brain → Jobs/Matching → Saved/Applications
                                      ↓
                       Interview / Coach / Learning / Analytics
```

Every module reads from `career_brain` + `resume_versions` + real activity tables. When the resume changes, one invalidation fan-out refreshes every dependent query.

## Phase 1 — Resume parsing accuracy (the foundation)

Files: `src/lib/resume.functions.ts`, `src/lib/resume-schema.ts`, `src/features/resume/upload-processor.ts`.

- Switch extraction to `google/gemini-2.5-pro` with strict `Output.object` schema.
- Rewrite the system prompt: extract-only, never invent, leave fields empty when absent, preserve exact URLs (LinkedIn/GitHub/portfolio/website), keep original casing/punctuation for names and companies.
- Post-process pass in TS: URL normalizer that only cleans whitespace/trailing punctuation (never reconstructs missing domains), phone/email regex validators, ISO date coercion with `null` fallback.
- Add a repair pass: if URL fields fail regex, re-scan the raw resume text for `linkedin.com/in/…`, `github.com/…`, common portfolio patterns and lift them in verbatim.
- Persist raw model output alongside structured output in `resume_versions.content` for auditability.

## Phase 2 — Career Brain as single source of truth

Files: `src/lib/career-brain.service.ts`, `src/lib/career-intel.functions.ts`.

- Rebuild the snapshot deterministically from the active `resume_versions` row: skills, seniority, target roles, tech stack, education, location.
- Delete any static "if empty then demo" fallback branches; return `{ ready: false }` when there is no active resume.
- Add a version stamp (`brain_version = resume.id + updated_at`) that downstream queries key on.

## Phase 3 — Jobs pipeline: real data + View Details + Saved

Files: `src/lib/jobs/matching.server.ts`, `src/lib/jobs/scoring.ts`, `src/lib/jobs/sections.server.ts`, `src/lib/jobs/dev-seed.server.ts`, `src/routes/_authenticated/jobs.$jobId.tsx`, `src/routes/_authenticated/jobs.saved.tsx`, `src/features/jobs/job-card.tsx`.

- **Fake data**: keep `dev-seed.server.ts` but hard-gate it behind `has_role(admin)` at runtime AND behind an explicit admin action — no dashboard, no auto-seed on empty. Never called from user paths.
- **Matching**: require Career Brain ready; score = weighted (skills 45, role/title 20, seniority 15, tech stack 10, location 5, education 5); reject rows scoring < 15 so a Python dev never sees Marketing.
- **View Details**: fix `/jobs/$jobId` loader to fetch the full job row + provider metadata + computed match + missing skills; ensure the route file exists and card links use typed `<Link to="/jobs/$jobId" params={{ jobId }}>`.
- **Saved jobs**: single `saved_jobs` mutation with optimistic update, invalidate `["saved-jobs"]` and `["job-matches"]`; Saved page shows Remove/Apply/View Details, supports search + sort + filter.

## Phase 4 — Interview / Coach / Learning driven by Brain + activity

Files: `src/lib/workspace-assistant.functions.ts`, `src/routes/_authenticated/interview.tsx`, `src/routes/_authenticated/coach.tsx`, `src/routes/_authenticated/learning.tsx`.

- Replace all hard-coded question/topic arrays with generators that take `{ brain, targetJob?, recentActivity }` and call Lovable AI with strict schema.
- Persist to existing tables: `interview_sessions`, `interview_questions`, `recommendation_history`, `search_history`.
- Coach + Learning read `career_health`, `gap_analysis`, `job_matches` (top missing skills) and recent `viewed_jobs`/`saved_jobs` to bias recommendations.

## Phase 5 — Global search, Analytics, cross-module sync

Files: `src/features/jobs/nl-search.tsx` (promote to global), `src/routes/_authenticated/analytics.tsx`, `src/lib/stats.functions.ts`, `src/routes/__root.tsx` (query invalidation fan-out).

- **Global search**: one server fn `searchAll({ q })` fanning across jobs, skills, companies, saved, applications, career_brain, learning topics; results grouped by type with typed navigation.
- **Analytics**: every card/graph reads real tables (`application_workspaces`, `viewed_jobs`, `saved_jobs`, `resume_versions`, `interview_sessions`, `ai_application_sessions`, `career_health`); delete mock series.
- **Sync**: on resume approval, invalidate keys `["career-brain"]`, `["job-matches"]`, `["dashboard"]`, `["analytics"]`, `["learning"]`, `["coach"]`, `["interview"]`. Add a Supabase realtime listener in `__root.tsx` for `resume_versions` + `career_brain` that fires the same invalidations across tabs.

## Verification checklist (run after each phase)

- Upload a real PDF → name/email/phone/LinkedIn/GitHub/portfolio all present and exact.
- Career Brain snapshot values equal resume values (no invented skills).
- Job list contains zero seed rows for a non-admin account; matches are role-relevant.
- View Details opens with full job payload; Save toggles counts everywhere.
- Interview/Coach/Learning content references user's actual skills and target role.
- Analytics cards match `select count(*)` on their source tables.
- Deleting the resume clears the brain and empties dependent widgets (no ghost data).

## Rollout order

Phase 1 → 2 → 3 → 4 → 5, each phase merged and verified before the next. Phase 1 alone unblocks accuracy for every other module, so I'll start there once you approve.

## Technical notes

- Model: `google/gemini-2.5-pro` for resume parsing (one call per upload). Reasoning/other modules stay on `google/gemini-3-flash-preview` for cost.
- Zod schemas live in `src/lib/resume-schema.ts` and are shared between server fn and client review UI.
- Admin gate for `dev-seed`: check `has_role(auth.uid(), 'admin')` server-side; UI entry only in `/admin/jobs`.
- Query cache: use existing TanStack Query client; keys standardized in a new `src/lib/query-keys.ts` so invalidation is centralized.
