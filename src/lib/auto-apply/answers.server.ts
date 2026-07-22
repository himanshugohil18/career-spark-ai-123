import { callLovableAI, extractJson } from "@/lib/ai-gateway.server";
import type { CareerBrainSnapshot } from "@/lib/career-brain.service";
import type { CompanyIntel } from "./company-intel.server";

export type QAPair = { question: string; answer: string; confidence: number };

const STANDARD_QUESTIONS = [
  "Tell us about yourself.",
  "Why do you want to join us?",
  "What interests you about this role?",
  "Describe a difficult project you shipped.",
  "What are your salary expectations?",
  "What is your notice period?",
  "What is your preferred work location?",
];

function briefBrain(brain: CareerBrainSnapshot): string {
  const identity = brain.identity;
  const skills = brain.skills.slice(0, 20).map((s) => s.name).join(", ");
  const roles = brain.experiences
    .slice(0, 4)
    .map(
      (e: Record<string, unknown>) =>
        `${e.role ?? "Role"} @ ${e.company ?? "Company"}${e.summary ? ` — ${String(e.summary).slice(0, 160)}` : ""}`,
    )
    .join("\n");
  const projects = brain.projects
    .slice(0, 3)
    .map((p: Record<string, unknown>) => `${p.name ?? "Project"}: ${String(p.summary ?? "").slice(0, 140)}`)
    .join("\n");
  return `Name: ${identity.fullName ?? "?"} | Current: ${identity.currentTitle ?? "?"} | YOE: ${identity.yearsOfExperience ?? "?"} | Location: ${identity.location ?? "?"}
Preferred role: ${identity.preferences.preferredRole ?? "?"} | Salary: ${identity.preferences.expectedSalary ?? "?"} | Pref loc: ${identity.preferences.preferredLocation ?? "?"}
Summary: ${(identity.professionalSummary ?? "").slice(0, 400)}
Top skills: ${skills}
Recent roles:
${roles}
Highlighted projects:
${projects}`;
}

export async function generateApplicationAnswers(input: {
  brain: CareerBrainSnapshot;
  jobTitle: string;
  companyName: string;
  jobDescription: string | null;
  companyIntel: CompanyIntel;
  extraQuestions?: string[];
}): Promise<QAPair[]> {
  const questions = [
    ...STANDARD_QUESTIONS,
    ...(input.extraQuestions ?? []).slice(0, 8),
  ];

  const prompt = `You are drafting concise, honest answers to a job application.
Return ONLY a JSON object shaped like:
{ "answers": [{ "question": string, "answer": string, "confidence": number 0..1 }] }

Rules:
- Ground every answer in the candidate profile below. Do NOT invent employers,
  numbers, or credentials.
- 90-180 words per answer for open-ended questions, 1 short line for salary /
  notice / location.
- Use "I" voice. No lists unless the question asks for them.
- If the profile lacks the info (e.g. salary), return your best inference and
  mark confidence <= 0.4.

## Candidate profile
${briefBrain(input.brain)}

## Target role
${input.jobTitle} @ ${input.companyName}
${(input.jobDescription ?? "").slice(0, 1400)}

## Company intel
${input.companyIntel.overview}
Mission: ${input.companyIntel.mission ?? ""}
Products: ${input.companyIntel.products.join(", ")}
Hiring priorities: ${input.companyIntel.hiringPriorities.join(", ")}

## Questions (answer each)
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}
`;

  try {
    const raw = await callLovableAI({
      messages: [
        { role: "system", content: "Return only valid JSON. No prose." },
        { role: "user", content: prompt },
      ],
      responseFormat: "json_object",
      temperature: 0.5,
      maxTokens: 2200,
    });
    const parsed = JSON.parse(extractJson(raw)) as { answers?: QAPair[] };
    if (!Array.isArray(parsed.answers)) return [];
    return parsed.answers
      .filter((a) => a && typeof a.question === "string" && typeof a.answer === "string")
      .slice(0, questions.length + 2)
      .map((a) => ({
        question: String(a.question).slice(0, 400),
        answer: String(a.answer).slice(0, 2400),
        confidence: Math.max(0, Math.min(1, Number(a.confidence ?? 0.6))),
      }));
  } catch {
    return [];
  }
}
