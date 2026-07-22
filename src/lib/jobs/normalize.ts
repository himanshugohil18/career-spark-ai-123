/**
 * Provider-agnostic normalization helpers. Providers reduce their raw payloads
 * to plain strings/numbers and pass them here. No provider-specific branches
 * live in downstream code.
 */

import sanitizeHtml from "sanitize-html";
import type {
  EmploymentType,
  ExperienceLevel,
  RemoteStatus,
} from "./types";

export function sanitizeDescription(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "b", "i", "em", "strong", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "a", "code", "pre", "blockquote",
    ],
    allowedAttributes: { a: ["href", "target", "rel"] },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

const REMOTE_HINTS = /\b(fully remote|100% remote|remote(-| )first|work from anywhere|distributed)\b/i;
const REMOTE_ONLY = /\bremote\b/i;
const HYBRID_HINTS = /\bhybrid\b/i;
const ONSITE_HINTS = /\b(on[- ]?site|in[- ]?office|no remote)\b/i;

export function detectRemoteStatus(input: {
  location?: string | null;
  description?: string | null;
  workplaceType?: string | null;
}): RemoteStatus {
  const bag = `${input.location ?? ""} ${input.workplaceType ?? ""} ${input.description ?? ""}`;
  if (input.workplaceType) {
    const w = input.workplaceType.toLowerCase();
    if (w.includes("remote")) return "remote";
    if (w.includes("hybrid")) return "hybrid";
    if (w.includes("on")) return "onsite";
  }
  if (REMOTE_HINTS.test(bag)) return "remote";
  if (HYBRID_HINTS.test(bag)) return "hybrid";
  if (ONSITE_HINTS.test(bag)) return "onsite";
  if (REMOTE_ONLY.test(input.location ?? "")) return "remote";
  return "unknown";
}

export function normalizeEmployment(raw: string | null | undefined): EmploymentType {
  const s = (raw ?? "").toLowerCase();
  if (!s) return "unknown";
  if (s.includes("intern")) return "internship";
  if (s.includes("temp")) return "temporary";
  if (s.includes("freelance")) return "freelance";
  if (s.includes("contract")) return "contract";
  if (s.includes("part")) return "part_time";
  if (s.includes("full")) return "full_time";
  return "unknown";
}

export function detectExperience(title: string, description?: string | null): ExperienceLevel {
  const t = `${title} ${description ?? ""}`.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return "intern";
  if (/\b(entry|graduate|associate)\b/.test(t)) return "entry";
  if (/\bjunior\b/.test(t)) return "junior";
  if (/\b(staff|principal)\b/.test(t)) return t.includes("principal") ? "principal" : "staff";
  if (/\blead\b/.test(t)) return "lead";
  if (/\b(vp|head of|director|chief|cto|ceo)\b/.test(t)) return "executive";
  if (/\bsenior|sr\.?\b/.test(t)) return "senior";
  if (/\bmid[- ]?level\b/.test(t)) return "mid";
  return "unknown";
}

const CURRENCY_MAP: Record<string, string> = {
  "$": "USD", "USD": "USD", "€": "EUR", "EUR": "EUR",
  "£": "GBP", "GBP": "GBP", "₹": "INR", "INR": "INR",
  "CAD": "CAD", "AUD": "AUD",
};

export function parseSalary(text: string | null | undefined): {
  min: number | null;
  max: number | null;
  currency: string | null;
} {
  if (!text) return { min: null, max: null, currency: null };
  const s = text.replace(/,/g, "");
  let currency: string | null = null;
  for (const key of Object.keys(CURRENCY_MAP)) {
    if (s.includes(key)) { currency = CURRENCY_MAP[key]; break; }
  }
  const nums = Array.from(s.matchAll(/\$?(\d{2,3})(?:k|K|000)?(?:\.\d+)?/g))
    .map((m) => {
      const n = Number(m[1]);
      const raw = m[0];
      if (raw.toLowerCase().includes("k")) return n * 1000;
      if (raw.includes("000")) return Number(raw.replace(/\D/g, ""));
      return n < 500 ? n * 1000 : n;
    })
    .filter((n) => n >= 10000 && n <= 2_000_000);
  if (nums.length === 0) return { min: null, max: null, currency };
  if (nums.length === 1) return { min: nums[0], max: nums[0], currency };
  return { min: Math.min(...nums), max: Math.max(...nums), currency };
}

const KNOWN_SKILLS = [
  "javascript","typescript","react","next.js","node","node.js","python","django","flask","fastapi",
  "ruby","rails","go","golang","rust","java","spring","kotlin","swift","objective-c",
  "aws","gcp","azure","kubernetes","docker","terraform","ansible","pulumi","helm",
  "postgres","postgresql","mysql","mongodb","redis","kafka","rabbitmq","elasticsearch",
  "graphql","rest","grpc","microservices","serverless","lambda",
  "ci/cd","github actions","gitlab","jenkins","circleci",
  "linux","bash","nginx","haproxy","prometheus","grafana","datadog","opentelemetry",
  "sql","nosql","spark","hadoop","airflow","dbt","snowflake","bigquery",
  "machine learning","pytorch","tensorflow","langchain","openai","llm","rag","vector db","pinecone",
  "figma","tailwind","css","html","vue","svelte","angular",
  "product management","agile","scrum","leadership","mentoring",
  "devops","sre","platform engineering","security","iam","oauth","jwt","zero trust",
];

export function extractSkills(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = ` ${text.toLowerCase()} `;
  const found = new Set<string>();
  for (const s of KNOWN_SKILLS) {
    const needle = ` ${s} `;
    if (lower.includes(needle)) found.add(s);
  }
  return Array.from(found);
}

export function splitBullets(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n|•|\r|<li>|<\/li>|(?:^|\s)-\s+/)
    .map((l) => stripHtml(l).trim())
    .filter((l) => l.length > 3 && l.length < 400)
    .slice(0, 20);
}

export function detectCountry(location: string | null | undefined): string | null {
  if (!location) return null;
  const parts = location.split(",").map((p) => p.trim());
  return parts[parts.length - 1] || null;
}
