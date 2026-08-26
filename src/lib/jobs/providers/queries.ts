/**
 * Search-query expansion for query-first providers.
 *
 * India's entry-level market is advertised with vocabulary that plain role
 * titles never hit: "fresher", "graduate engineer trainee", "GET", "campus
 * hire", "0-1 years". A candidate with little or no experience therefore gets
 * their role queries expanded with those phrasings so ingestion actually
 * reaches junior supply instead of only senior postings.
 */

const ENTRY_MODIFIERS = ["fresher", "entry level", "graduate trainee", "junior"];
const ENTRY_STANDALONE = [
  "software engineer fresher",
  "graduate engineer trainee",
  "associate software engineer",
  "trainee software developer",
  "software development intern",
  "campus hire software engineer",
];

export type Seniority = "intern" | "entry" | "junior" | "mid" | "senior" | "staff" | null;

export function isEarlyCareer(seniority: Seniority, years: number | null | undefined): boolean {
  if (seniority === "intern" || seniority === "entry" || seniority === "junior") return true;
  return typeof years === "number" && years < 2;
}

/**
 * Expand role queries for the candidate's seniority band. Original queries are
 * always kept first so provider relevance is never diluted.
 */
export function expandRoleQueries(
  roleQueries: string[],
  seniority: Seniority,
  years: number | null | undefined,
  max = 24,
): string[] {
  const base = roleQueries.filter((q) => q && q.trim().length > 0);
  if (!isEarlyCareer(seniority, years)) return base.slice(0, max);

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (q: string) => {
    const key = q.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(q.trim());
  };

  for (const q of base) push(q);
  // Modified variants of the candidate's own top roles come before generic ones.
  for (const modifier of ENTRY_MODIFIERS) {
    for (const q of base.slice(0, 4)) push(`${modifier} ${q}`);
  }
  for (const q of ENTRY_STANDALONE) push(q);
  return out.slice(0, max);
}

export { ENTRY_MODIFIERS, ENTRY_STANDALONE };
