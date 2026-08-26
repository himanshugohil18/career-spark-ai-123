/**
 * Career Roadmap + Project Recommendation generators.
 * AI (Gemini via Lovable gateway) generates the plan; everything is
 * persisted so the UI is always backed by real rows.
 */

import { callLovableAI, extractJson } from "../ai-gateway.server";
import type { CareerBrainSnapshot } from "../career-brain.service";

const MODEL = "google/gemini-3-flash-preview";

export type RoadmapInput = {
  currentRole: string | null;
  targetRole: string;
  targetLocation?: string | null;
  targetSalary?: string | null;
  targetTimeline?: string | null;
};

export type GeneratedRoadmapItem = {
  phase: number;
  phaseLabel: string;
  title: string;
  description: string;
  itemType: "skill" | "project" | "certification" | "interview_prep" | "portfolio";
  skills: string[];
};

export async function generateRoadmapItems(
  input: RoadmapInput,
  brain: CareerBrainSnapshot,
): Promise<GeneratedRoadmapItem[]> {
  const system = `You are a senior career strategist. Build a realistic, staged career roadmap. Return STRICT JSON only. Phases must progress logically from the user's current skills to the target role. 3-5 phases, 2-4 items per phase. Never invent skills the user already has as "to learn" — build on them. Be specific: name real technologies, real certifications, real project types.`;
  const user = `USER CURRENT STATE:
- Current role: ${input.currentRole ?? brain.identity.currentTitle ?? "early career"}
- Years of experience: ${brain.identity.yearsOfExperience ?? "unknown"}
- Skills: ${brain.skills.map((s) => s.name).slice(0, 30).join(", ") || "none on record"}
- Projects: ${(brain.projects ?? []).map((p) => p?.name).filter(Boolean).slice(0, 8).join(", ") || "none"}

TARGET:
- Role: ${input.targetRole}
- Location: ${input.targetLocation ?? "flexible"}
- Timeline: ${input.targetTimeline ?? "flexible"}

Return JSON: { "items": [{ "phase": 1, "phaseLabel": "Foundations", "title": string, "description": string, "itemType": "skill"|"project"|"certification"|"interview_prep"|"portfolio", "skills": string[] }] }`;

  const raw = await callLovableAI({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseFormat: "json_object",
    temperature: 0.3,
  });
  const parsed = JSON.parse(extractJson(raw)) as { items?: GeneratedRoadmapItem[] };
  return (parsed.items ?? []).filter((i) => i.title && i.phase);
}

export type GeneratedProject = {
  name: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "portfolio";
  description: string;
  whyRecommended: string;
  architectureOverview: string;
  skillsCovered: string[];
  techStack: string[];
  learningGoals: string[];
  checklist: string[];
};

export async function generateProjectRecommendations(
  targetRole: string,
  missingSkills: string[],
  brain: CareerBrainSnapshot,
): Promise<GeneratedProject[]> {
  const system = `You are a staff engineer mentoring a candidate. Recommend 4 portfolio projects that close the candidate's skill gaps for their target role. Return STRICT JSON only. Projects must be concrete, buildable, and progressive in difficulty. Each checklist has 4-8 verifiable steps.`;
  const user = `TARGET ROLE: ${targetRole}
MISSING SKILLS: ${missingSkills.slice(0, 10).join(", ") || "general depth"}
EXISTING SKILLS: ${brain.skills.map((s) => s.name).slice(0, 30).join(", ") || "none on record"}
EXISTING PROJECTS: ${(brain.projects ?? []).map((p) => p?.name).filter(Boolean).slice(0, 8).join(", ") || "none"}

Do not recommend projects that duplicate what they already built. Return JSON:
{ "projects": [{ "name": string, "difficulty": "beginner"|"intermediate"|"advanced"|"portfolio", "description": string, "whyRecommended": string, "architectureOverview": string, "skillsCovered": string[], "techStack": string[], "learningGoals": string[], "checklist": string[] }] }`;

  const raw = await callLovableAI({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseFormat: "json_object",
    temperature: 0.4,
  });
  const parsed = JSON.parse(extractJson(raw)) as { projects?: GeneratedProject[] };
  return (parsed.projects ?? []).filter((p) => p.name);
}
