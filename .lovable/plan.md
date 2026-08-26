# CareerOS Intelligence Layer — Master Upgrade

Transform CareerOS into a connected AI Career Operating System. **Nothing existing is removed or broken** — every feature builds on current tables, themes, and routes. All data is real; empty states guide the user when data is missing.

## What already exists (reused, not rebuilt)
- Career Brain snapshot (`career-brain-logic.server.ts`) — skills, experiences, projects, education, completeness
- Job match scoring + MatchBreakdown UI, `application_readiness`, `gap_analysis`, `ats_analysis` tables
- Interview sessions/questions tables, learning/coach routes, notifications.functions, tracker, resume studio, analytics

## New database tables (one migration, all with RLS + grants)
- `career_roadmaps` — target role, location, salary, timeline, status
- `career_roadmap_items` — phase, title, type (skill/project/cert/prep), status (not_started/in_progress/completed/skipped), sort order, linked ids
- `project_recommendations` — name, difficulty, skills covered, stack, checklist, status, source (AI)
- `career_missions` — daily mission items + completion state (marked only by real actions)
- `notification_preferences` — per-category enable/disable
- `resume_version_stats` view usage: reuse existing `resume_versions` + applications join (no new table)
- Extend `notifications` categories via existing table if present (checked during migration)

## Phase 1 — Intelligence foundation (server logic)
- `src/lib/intelligence/readiness.server.ts` — Career Readiness Score: weighted from profile completeness, resume quality, skills count/confidence, projects, market alignment (job_matches), application activity, interview sessions, learning progress. Returns per-category breakdown + highest-impact next action.
- `src/lib/intelligence/next-action.server.ts` — Next Best Action engine: ranks saved high-match jobs, stale applications (7+ days → follow-up), top skill gaps, upcoming interviews, roadmap items.
- `src/lib/intelligence/skill-gap.server.ts` — compare brain skills vs job required/preferred skills (deterministic set-diff + existing AI analysis where present).
- `src/lib/intelligence/insights.server.ts` — Career Insights computed from real aggregates (e.g. "Terraform missing in 2 of your top 5 matches"). Returns `insufficient_data` state when empty.
- `src/lib/intelligence/missions.server.ts` — daily missions derived from next-action engine; completion verified against real activity (applications created, interview questions answered, roadmap items completed).

## Phase 2 — Command Center dashboard
- Upgrade `_authenticated/dashboard.tsx`: greeting, clickable Readiness score w/ breakdown sheet, Today's Priorities, Today's Missions, Career Insights — all from Phase 1 functions, all real-data with proper empty states. Works in both themes.

## Phase 3 — Job Match Intelligence + Skill Gap UI
- Job detail (`jobs.$jobId.tsx`): AI Match Intelligence panel — overall match, category bars, Why You Match / What's Missing / Resume Improvement / Apply recommendation (reuses existing match + gap data; AI analysis on demand, cached).
- Skill gap actions: "Learn this skill" → learning, "Add to roadmap" → roadmap item insert, "Find a project" → project recommendations.
- Company Intelligence section on job detail: only data actually present (job record + company table + similar jobs); no fabrication.

## Phase 4 — Career Roadmap module
- New route `_authenticated/roadmap.tsx` + nav entry. Wizard: current role → target role/location/salary/timeline → AI generates phased roadmap (Gemini, strict JSON) saved to `career_roadmap_items`.
- Board view grouped by phase, item status cycling, progress bar, manual add/edit, links to learning/projects/jobs/interview.
- Interactive Career Graph (SVG tree: target role → domains → skills → tools → projects) with status colors; clicking a node opens detail popover with related jobs/projects/learning. Renders in both themes.

## Phase 5 — Project Recommendations + Learning intelligence
- `project_recommendations` generated from target role + missing skills (Gemini). Card UI w/ difficulty, stack, checklist; actions: Add to Roadmap, Start (status), Track progress.
- Learning page: each item shows "why recommended" (appears in N saved jobs), linked gap/jobs/roadmap phase; manual progress marking.

## Phase 6 — Application intelligence + notifications
- Analytics: real funnel (applications → responses → interviews → offers), rates, performance by role/resume version/match score, insights only when data suffices.
- Tracker: follow-up alerts (applied 7+ days, no response), resume-version-used and match-score snapshot columns surfaced.
- Smart notifications: job match, follow-up, skill-gap, interview-reminder, readiness-change generators + preferences UI in Settings.

## Phase 7 — AI Interview Simulator + Career Copilot
- Interview: type selector (HR/Technical/Behavioral/System Design/Mixed), job/company/difficulty/tech focus; text-based simulator; post-session analysis (5 scored dimensions + strong/improvement areas + practice questions) saved to existing interview tables; history + progress chart. Architecture leaves room for voice later; no fake voice.
- Copilot (chat): system context now includes readiness, roadmap, top gaps, stale applications, upcoming interviews; dynamic suggested questions from user state.

## Phase 8 — Resume Version Manager
- Resume Studio list: versions grouped under master, with target role, last modified, linked applications count, performance where data exists. Actions: duplicate, rename, archive, set default, generate job-specific version.

## Design & quality
- Uses existing theme tokens only — renders correctly in Classic + Immersive; no per-theme logic duplication.
- Loading skeletons, error states, actionable empty states everywhere; fully responsive, no fake data.
- Heavy AI calls are on-demand + cached (input hash), never block page load.

## Rollout & verification
Phase 1–2 first (dashboard comes alive), then 3–8 in order. Final sweep: Playwright check of dashboard, job detail, roadmap, interview, analytics in both themes; confirm zero console errors and all existing routes intact.

## Technical notes
- All AI via existing `callLovableAI` gateway helper (`google/gemini-3-flash-preview`, `json_object`, temp 0.2) — same pattern as `workspace/analysis.server.ts`.
- Server fns in `src/lib/intelligence/*.functions.ts` with `requireSupabaseAuth`; helpers in `.server.ts`.
- Query keys added to central invalidation so resume/brain changes refresh readiness, roadmap, missions.
