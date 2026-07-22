/**
 * Global search — searches jobs (all + user's matches), applications, companies,
 * skills, and interview questions for the signed-in user. Powers the ⌘K
 * command palette.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SearchHit = {
  kind: "job" | "application" | "company" | "skill" | "question" | "resume";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  score?: number;
};

const sel = (s: string): string => s;

export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ q: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const q = data.q.trim();
    const safe = q.replace(/[%_,()]/g, " ").trim();
    const like = `%${safe}%`;
    const uid = context.userId;
    const s = context.supabase;

    // 1) Resolve matching companies for company-name hits on jobs
    const companyHits = await s
      .from("companies")
      .select(sel("id, name, industry"))
      .ilike("name", like)
      .limit(20);
    const companyIds = (companyHits.data ?? []).map((c: any) => c.id);

    // Build OR filter for jobs: title/location ilike, or company_id in matched companies
    const orParts = [`title.ilike.${like}`, `location.ilike.${like}`];
    if (companyIds.length) orParts.push(`company_id.in.(${companyIds.join(",")})`);

    const [jobsAll, matches, apps, skills, questions, resumes] = await Promise.all([
      s.from("jobs")
        .select(sel("id, title, location, company:companies(id,name)"))
        .or(orParts.join(","))
        .order("posted_at", { ascending: false })
        .limit(20),
      s.from("job_matches")
        .select(sel("job_id, overall_score"))
        .eq("user_id", uid)
        .order("overall_score", { ascending: false })
        .limit(500),
      s.from("application_workspaces")
        .select(sel("id, current_stage, readiness_score, job:jobs(title, company:companies(name))"))
        .eq("user_id", uid)
        .limit(200),
      s.from("skills")
        .select(sel("id, name, category, proficiency"))
        .eq("user_id", uid)
        .ilike("name", like)
        .limit(10),
      s.from("interview_questions")
        .select(sel("id, question, category"))
        .eq("user_id", uid)
        .ilike("question", like)
        .limit(8),
      s.from("resume_versions")
        .select(sel("id, version_name, is_active"))
        .eq("user_id", uid)
        .ilike("version_name", like)
        .limit(5),
    ]);

    const scoreByJob = new Map<string, number>();
    for (const m of (matches.data ?? []) as any[]) {
      if (m.job_id) scoreByJob.set(m.job_id, Number(m.overall_score ?? 0));
    }

    const ql = q.toLowerCase();
    const hits: SearchHit[] = [];

    // Jobs (matched ones first, then others)
    const jobRows = ((jobsAll.data ?? []) as any[]).slice();
    jobRows.sort((a, b) => (scoreByJob.get(b.id) ?? -1) - (scoreByJob.get(a.id) ?? -1));
    for (const j of jobRows) {
      hits.push({
        kind: "job",
        id: j.id,
        title: j.title,
        subtitle: [j.company?.name, j.location].filter(Boolean).join(" · "),
        href: `/jobs/${j.id}`,
        score: scoreByJob.get(j.id),
      });
      if (hits.filter((h) => h.kind === "job").length >= 10) break;
    }

    for (const w of (apps.data ?? []) as any[]) {
      const hay = `${w.job?.title ?? ""} ${w.job?.company?.name ?? ""}`.toLowerCase();
      if (!hay.includes(ql)) continue;
      hits.push({
        kind: "application",
        id: w.id,
        title: w.job?.title ?? "Application",
        subtitle: `${w.job?.company?.name ?? ""} · ${w.current_stage ?? "draft"}`,
        href: `/applications/${w.id}`,
        score: Number(w.readiness_score ?? 0),
      });
    }

    for (const c of (companyHits.data ?? []).slice(0, 8)) {
      hits.push({
        kind: "company",
        id: c.id,
        title: c.name,
        subtitle: c.industry ?? undefined,
        href: `/jobs?company=${encodeURIComponent(c.name)}`,
      });
    }

    for (const sk of skills.data ?? []) {
      hits.push({
        kind: "skill",
        id: sk.id,
        title: sk.name,
        subtitle: [sk.category, sk.proficiency].filter(Boolean).join(" · ") || undefined,
        href: `/learning`,
      });
    }

    for (const q2 of (questions.data ?? []) as any[]) {
      hits.push({
        kind: "question",
        id: q2.id,
        title: q2.question,
        subtitle: q2.category ?? "interview",
        href: `/interview`,
      });
    }

    for (const r of resumes.data ?? []) {
      hits.push({
        kind: "resume",
        id: r.id,
        title: r.version_name,
        subtitle: r.is_active ? "Active resume" : "Resume version",
        href: `/resume-review/${r.id}`,
      });
    }

    return { q, hits: hits.slice(0, 40) };
  });
