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
    "india", "bharat", "bengaluru", "bangalore", "mumbai", "bombay", "navi mumbai", "thane",
    "delhi", "new delhi", "ncr", "noida", "gurgaon", "gurugram", "faridabad", "ghaziabad",
    "pune", "pimpri", "hyderabad", "secunderabad", "chennai", "madras", "kolkata", "calcutta",
    "ahmedabad", "gandhinagar", "jaipur", "indore", "bhopal", "surat", "vadodara", "rajkot",
    "kochi", "cochin", "trivandrum", "thiruvananthapuram", "coimbatore", "madurai", "mysore",
    "mysuru", "chandigarh", "mohali", "lucknow", "kanpur", "nagpur", "nashik", "visakhapatnam",
    "vijayawada", "bhubaneswar", "guwahati", "dehradun", "raipur", "gujarat", "maharashtra",
    "karnataka", "tamil nadu", "telangana", "kerala", "rajasthan", "punjab", "haryana",
    "west bengal", "uttar pradesh", "madhya pradesh", "andhra pradesh", "odisha",
  ],
  "united states": ["usa", "u.s.", "united states", "new york", "san francisco", "seattle", "austin", "boston", "chicago"],
  "united kingdom": ["uk", "united kingdom", "london", "manchester", "england"],
  germany: ["germany", "berlin", "munich", "hamburg"],
  canada: ["canada", "toronto", "vancouver", "montreal"],
};

/** Country names/abbreviations — never treated as a "city" match. */
const COUNTRY_WORDS = new Set([
  "india", "bharat", "usa", "us", "u.s.", "united states", "america", "uk",
  "united kingdom", "england", "germany", "canada", "remote", "anywhere", "worldwide",
]);


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
  /** Posting text — used to detect geo-restricted remote ("US only"). */
  description?: string | null;
  preferred: Array<string | null | undefined>;
};

/** Country a remote posting is restricted to, or null when worldwide. */
function remoteRestriction(input: LocationAffinityInput): string | null {
  const blob = norm(
    `${input.jobLocation ?? ""} ${input.jobCountry ?? ""} ${(input.description ?? "").slice(0, 1200)}`,
  );
  if (/\b(worldwide|anywhere|global|globally|any location)\b/.test(blob)) return null;
  const c = countryOf(norm(`${input.jobLocation ?? ""} ${input.jobCountry ?? ""}`));
  if (c) return c;
  const m = blob.match(/\b(?:us|usa|united states|uk|united kingdom|canada|germany|india)\b(?=[^a-z]*only)/);
  if (m) return countryOf(m[0]) ?? m[0];
  return null;
}

export function locationAffinity(input: LocationAffinityInput): number {
  const prefs = input.preferred.map(norm).filter(Boolean);
  const jobText = norm(`${input.jobLocation ?? ""} ${input.jobCountry ?? ""}`);
  const remote = (input.remoteStatus ?? "").toLowerCase();

  const wantsRemote = prefs.some((p) => p.includes("remote") || p.includes("anywhere"));
  if (remote === "remote") {
    // A remote role restricted to another country is NOT globally remote for
    // this candidate — an India-based user cannot take a "Remote (US only)"
    // job, so it must never rank like an India-remote role.
    const restrictedTo = remoteRestriction(input);
    const prefCountry = prefs.map(countryOf).find(Boolean) ?? null;
    if (restrictedTo && prefCountry && restrictedTo !== prefCountry) return 0.34;
    if (restrictedTo && prefCountry && restrictedTo === prefCountry) return 1;
    return wantsRemote ? 1 : 0.86;
  }
  if (!prefs.length) return jobText ? 0.6 : 0.55;
  if (!jobText) return 0.5;

  for (const pref of prefs) {
    // Country words ("India") must not count as a city hit, otherwise every
    // Indian job looks like it's in the user's own city.
    for (const term of tokens(pref).filter((t) => !COUNTRY_WORDS.has(t)).flatMap(expand)) {
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
    ...(Array.isArray(brain?.location_preferences) ? brain.location_preferences : []),
    ...(Array.isArray(brain?.locationPreferences) ? brain.locationPreferences : []),
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/**
 * Nearby-city graph: cities a candidate can realistically commute to or
 * relocate within. Used for the "near your location" tier, which sits
 * between an exact city hit and a generic same-country hit.
 */
const NEARBY_CITIES: Record<string, string[]> = {
  ahmedabad: ["gandhinagar", "vadodara", "surat", "rajkot", "anand", "nadiad"],
  gandhinagar: ["ahmedabad", "vadodara", "surat"],
  vadodara: ["ahmedabad", "surat", "anand", "gandhinagar"],
  surat: ["vadodara", "ahmedabad", "navsari"],
  rajkot: ["ahmedabad", "jamnagar", "gandhinagar"],
  mumbai: ["thane", "navi mumbai", "pune", "nashik"],
  pune: ["mumbai", "thane", "navi mumbai", "nashik"],
  bengaluru: ["bangalore", "mysore", "mysuru", "hosur"],
  bangalore: ["bengaluru", "mysore", "mysuru", "hosur"],
  hyderabad: ["secunderabad", "warangal", "vijayawada"],
  chennai: ["coimbatore", "bengaluru", "madurai"],
  delhi: ["noida", "gurgaon", "gurugram", "faridabad", "ghaziabad", "ncr"],
  noida: ["delhi", "gurgaon", "gurugram", "ghaziabad", "ncr"],
  gurgaon: ["delhi", "noida", "faridabad", "ncr"],
  gurugram: ["delhi", "noida", "faridabad", "ncr"],
  kolkata: ["howrah", "durgapur", "siliguri"],
  jaipur: ["delhi", "gurgaon", "udaipur"],
  indore: ["bhopal", "ujjain"],
  kochi: ["trivandrum", "thiruvananthapuram", "coimbatore"],
  chandigarh: ["mohali", "panchkula", "delhi"],
};

const INDIA_TERMS = COUNTRY_HINTS.india;

/** True when a posting is located in India (or explicitly India-remote). */
export function isIndiaJob(location?: string | null, country?: string | null): boolean {
  const text = norm(`${location ?? ""} ${country ?? ""}`);
  if (!text) return false;
  return INDIA_TERMS.some(
    (h) =>
      h.length > 2 &&
      (text === h || text.includes(` ${h}`) || text.startsWith(`${h} `) || text.includes(`, ${h}`)),
  );
}

/** True when the candidate's own location/preferences point at India. */
export function candidateIsIndian(preferred: Array<string | null | undefined>): boolean {
  return preferred.some((p) => isIndiaJob(p, null));
}

export type ProximityTier = "same-city" | "nearby-city" | "same-country" | "remote" | "far";

export type ProximityResult = {
  score: number;
  tier: ProximityTier;
  label: string | null;
};

/**
 * Richer than locationAffinity: also resolves the "nearby city" tier so the
 * feed can surface jobs closest to the city on the user's resume first, and
 * exposes a human label for the UI ("Near Ahmedabad").
 */
export function locationProximity(input: LocationAffinityInput): ProximityResult {
  const prefs = input.preferred.map(norm).filter(Boolean);
  const jobText = norm(`${input.jobLocation ?? ""} ${input.jobCountry ?? ""}`);
  const remote = (input.remoteStatus ?? "").toLowerCase();
  const base = locationAffinity(input);

  const prefTerms = prefs
    .flatMap((p) => tokens(p))
    .filter((t) => t.length >= 3 && !COUNTRY_WORDS.has(t));


  for (const term of prefTerms.flatMap(expand)) {
    if (term.length >= 3 && jobText.includes(term)) {
      return { score: Math.max(base, remote === "hybrid" ? 0.96 : 1), tier: "same-city", label: "In your city" };
    }
  }

  for (const term of prefTerms) {
    for (const near of NEARBY_CITIES[term] ?? []) {
      if (jobText.includes(near)) {
        const city = term.charAt(0).toUpperCase() + term.slice(1);
        return { score: Math.max(base, 0.9), tier: "nearby-city", label: `Near ${city}` };
      }
    }
  }

  if (remote === "remote") return { score: base, tier: "remote", label: "Remote" };

  const jobCountry = countryOf(jobText) ?? (norm(input.jobCountry ?? "") || null);
  const prefCountry = prefs.map(countryOf).find(Boolean) ?? null;
  if (jobCountry && prefCountry && jobCountry === prefCountry) {
    return { score: Math.max(base, 0.8), tier: "same-country", label: "In your country" };
  }

  return { score: base, tier: "far", label: null };
}

