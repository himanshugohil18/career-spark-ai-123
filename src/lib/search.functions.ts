/**
 * Global search — searches jobs (matched + saved), applications, companies,
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

export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ q: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const q = data.q.trim();
    const like = `%${q.replace(/[%_]/g, "")}%`;
    const uid = context.userId;
    const s = context.supabase;

    const [jobs, apps, companies, skills, questions, resumes] = await Promise.all([
      s.from("job_matches")
        .select("overall_score, job:jobs(id,title,location,company:companies(name))")
        .eq("user_id", uid)
        .order("overall_score", { ascending: false })
        .limit(200),
      s.from("application_workspaces")
        .select("id, current_stage, readiness_score, job:jobs(title, company:companies(name))")
        .eq("user_id", uid)
        .limit(200),
      s.from("companies").select("id, name, industry").ilike("name", like).limit(10),
      s.from("skills").select("id, name, category, proficiency").eq("user_id", uid).ilike("name", like).limit(10),
      s.from("interview_questions").select("id, question, category, workspace_id:session_id").eq("user_id", uid).ilike("question", like).limit(8),
      s.from("resume_versions").select("id, version_name, is_active").eq("user_id", uid).ilike("version_name", like).limit(5),
    ]);

    const ql = q.toLowerCase();
    const hits: SearchHit[] = [];

    for (const m of (jobs.data ?? []) as any[]) {
      const j = m.job;
      if (!j) continue;
      const hay = `${j.title ?? ""} ${j.company?.name ?? ""} ${j.location ?? ""}`.toLowerCase();
      if (!hay.includes(ql)) continue;
      hits.push({
        kind: "job",
        id: j.id,
        title: j.title,
        subtitle: [j.company?.name, j.location].filter(Boolean).join(" · "),
        href: `/jobs/${j.id}`,
        score: Number(m.overall_score ?? 0),
      });
      if (hits.length >= 8) break;
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

    for (const c of companies.data ?? []) {
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

    return { q, hits: hits.slice(0, 30) };
  });
