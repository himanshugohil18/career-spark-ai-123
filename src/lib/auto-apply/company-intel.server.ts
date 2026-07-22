import { callLovableAI, extractJson } from "@/lib/ai-gateway.server";

export type CompanyIntel = {
  overview: string;
  industry: string | null;
  products: string[];
  mission: string | null;
  recentNews: string[];
  techStack: string[];
  hiringPriorities: string[];
};

const EMPTY: CompanyIntel = {
  overview: "",
  industry: null,
  products: [],
  mission: null,
  recentNews: [],
  techStack: [],
  hiringPriorities: [],
};

export async function researchCompany(input: {
  companyName: string;
  jobTitle: string;
  jobDescription: string | null;
  companyWebsite: string | null;
}): Promise<CompanyIntel> {
  const prompt = `You are a career research analyst. Return a JSON object matching this schema exactly:
{ "overview": string, "industry": string, "products": string[], "mission": string,
  "recentNews": string[], "techStack": string[], "hiringPriorities": string[] }

Base every field on public general knowledge about the company. Do NOT invent
specific numbers, dates, or quotes. Keep each string under 220 chars.
If you have no confident information for a field, use an empty string or empty array.

Company: ${input.companyName}
Website: ${input.companyWebsite ?? "unknown"}
Target role: ${input.jobTitle}
Job description excerpt:
${(input.jobDescription ?? "").slice(0, 1200)}
`;

  try {
    const raw = await callLovableAI({
      messages: [
        { role: "system", content: "Return only valid JSON. No prose." },
        { role: "user", content: prompt },
      ],
      responseFormat: "json_object",
      temperature: 0.3,
      maxTokens: 900,
    });
    const parsed = JSON.parse(extractJson(raw)) as Partial<CompanyIntel>;
    return {
      overview: String(parsed.overview ?? "").slice(0, 800),
      industry: parsed.industry ? String(parsed.industry) : null,
      products: Array.isArray(parsed.products) ? parsed.products.slice(0, 8).map(String) : [],
      mission: parsed.mission ? String(parsed.mission) : null,
      recentNews: Array.isArray(parsed.recentNews) ? parsed.recentNews.slice(0, 5).map(String) : [],
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack.slice(0, 15).map(String) : [],
      hiringPriorities: Array.isArray(parsed.hiringPriorities)
        ? parsed.hiringPriorities.slice(0, 6).map(String)
        : [],
    };
  } catch {
    return EMPTY;
  }
}
