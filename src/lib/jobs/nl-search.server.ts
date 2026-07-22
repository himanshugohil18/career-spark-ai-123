/**
 * Natural-language search — translates "Remote DevOps jobs in Germany" into
 * a structured `JobFilters` object using Gemini structured output.
 */

import { z } from "zod";
import { callLovableAI, extractJson } from "@/lib/ai-gateway.server";
import type { JobFilters } from "./types";

const Schema = z.object({
  role: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  remoteStatus: z.array(z.enum(["remote","hybrid","onsite"])).optional(),
  employmentType: z
    .array(z.enum(["full_time","part_time","contract","internship","temporary","freelance"]))
    .optional(),
  experienceLevel: z
    .array(z.enum(["intern","entry","junior","mid","senior","staff","principal","lead","executive"]))
    .optional(),
  technology: z.array(z.string()).optional(),
  salaryMin: z.number().nullable().optional(),
  postedWithinDays: z.number().nullable().optional(),
});

export async function parseNaturalLanguage(query: string): Promise<JobFilters> {
  if (!query.trim()) return {};
  try {
    const raw = await callLovableAI({
      responseFormat: "json_object",
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: query },
      ],
    });
    const parsed = Schema.safeParse(JSON.parse(extractJson(raw)));
    if (!parsed.success) return { q: query };
    const d = parsed.data;
    return {
      q: query,
      role: d.role ?? undefined,
      location: d.location ?? undefined,
      remoteStatus: d.remoteStatus,
      employmentType: d.employmentType,
      experienceLevel: d.experienceLevel,
      technology: d.technology,
      salaryMin: d.salaryMin ?? undefined,
      postedWithinDays: d.postedWithinDays ?? undefined,
    };
  } catch {
    return { q: query };
  }
}

const SYSTEM = `You translate a plain-English job search query into JSON filters for a job feed.
Return ONLY JSON with these keys (all optional):
  role (string), location (string), remoteStatus (["remote"|"hybrid"|"onsite"]),
  employmentType (["full_time"|"part_time"|"contract"|"internship"|"temporary"|"freelance"]),
  experienceLevel (["intern"|"entry"|"junior"|"mid"|"senior"|"staff"|"principal"|"lead"|"executive"]),
  technology (string[]), salaryMin (number in USD), postedWithinDays (number).
If a field is not mentioned, omit it. Never invent values.`;
