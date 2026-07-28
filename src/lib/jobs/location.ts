/**
 * Location affinity — shared by the matching engine, the feed ranker and the
 * baseline scorer so "jobs near me" behaves consistently everywhere.
 *
 * Returns 0..1. Exact city hit ranks highest, then same metro/state, then same
 * country, then remote, then everything else.
 */

const CITY_ALIASES: Record<string, string[]> = {
  bengaluru: ["bangalore", "blr", "bengaluru"],
  bangalore: ["bengaluru", "blr", "bangalore"],
  mumbai: ["bombay", "navi mumbai", "thane", "mumbai"],
  delhi: ["new delhi", "ncr", "gurgaon", "gurugram", "noida", "delhi"],
  gurgaon: ["gurugram", "delhi", "ncr", "gurgaon"],
  gurugram: ["gurgaon", "delhi", "ncr", "gurugram"],
  noida: ["delhi", "ncr", "noida"],
  pune: ["pimpri", "chinchwad", "pune"],
  hyderabad: ["secunderabad", "hitech city", "hyderabad"],
  chennai: ["madras", "chennai"],
  ahmedabad: ["gandhinagar", "ahmedabad"],
  kolkata: ["calcutta", "kolkata"],
};

const COUNTRY_HINTS: Record<string, string[]> = {
  india: [
    "india", "in", "bengaluru", "bangalore", "mumbai", "delhi", "noida", "gurgaon",
    "gurugram", "pune", "hyderabad", "chennai", "kolkata", "ahmedabad", "jaipur",
    "indore", "surat", "kochi", "coimbatore", "chandigarh", "vadodara",
  ],
  "united states": ["usa", "u.s.", "united states", "us", "new york", "san francisco", "seattle", "austin", "boston", "chicago"],
  "united kingdom": ["uk", "united kingdom", "london", "manchester", "england"],
  germany: ["germany", "berlin", "munich", "hamburg"],
  canada: ["canada", "toronto", "vancouver", "montreal"],
};

function norm(v: string | null | undefined): string {
  return (v ?? "").toLowerCase().replace(/[^a-z\s,]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(v: string): string[] {
  return norm(v)
    .split(/[,/]|\s{2,}/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function expand(term: string): string[] {
  const out = new Set<string>([term]);
  for (const alias of CITY_ALIASES[term] ?? []) out.add(alias);
  return [...out];
}

function countryOf(text: string): string | null {
  for (const [country, hints] of Object.entries(COUNTRY_HINTS)) {
    if (hints.some((h) => text === h || text.includes(` ${h}`) || text.startsWith(`${h} `) || text.includes(`, ${h}`))) {
      return country;
    }
  }
  return null;
}

export type LocationAffinityInput = {
  jobLocation?: string | null;
  jobCountry?: string | null;
  remoteStatus?: string | null;
  preferred: Array<string | null | undefined>;
};

export function locationAffinity(input: LocationAffinityInput): number {
  const prefs = input.preferred.map(norm).filter(Boolean);
  const jobText = norm(`${input.jobLocation ?? ""} ${input.jobCountry ?? ""}`);
  const remote = (input.remoteStatus ?? "").toLowerCase();

  const wantsRemote = prefs.some((p) => p.includes("remote") || p.includes("anywhere"));
  if (remote === "remote") return wantsRemote ? 1 : 0.86;
  if (!prefs.length) return jobText ? 0.6 : 0.55;
  if (!jobText) return 0.5;

  for (const pref of prefs) {
    for (const term of tokens(pref).flatMap(expand)) {
      if (term.length < 3) continue;
      if (jobText.includes(term)) return remote === "hybrid" ? 0.96 : 1;
    }
  }

  const jobCountry = countryOf(jobText) ?? (norm(input.jobCountry ?? "") || null);
  const prefCountry = prefs.map(countryOf).find(Boolean) ?? null;
  if (jobCountry && prefCountry && jobCountry === prefCountry) return 0.8;

  if (remote === "hybrid") return 0.45;
  return 0.2;
}

/** Preferred-location strings pulled off a Career Brain snapshot. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function preferredLocations(brain: any): string[] {
  return [
    brain?.identity?.preferences?.preferredLocation,
    brain?.identity?.location,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}
