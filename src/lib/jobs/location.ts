/**
 * Location affinity — shared by the matching engine, the feed ranker and the
 * baseline scorer so "jobs near me" behaves consistently everywhere.
 *
 * Country/region resolution is delegated to ./geo (single source of truth), so
 * "Remote - US", "CA", "San Francisco" and "Bengaluru, Karnataka" all classify
 * correctly no matter which provider column they arrived in.
 */

import { resolveCountryCode, resolveGeo, isIndiaText, type Region } from "./geo";

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

/** Country names/abbreviations — never treated as a "city" match. */
const COUNTRY_WORDS = new Set([
  "india", "bharat", "usa", "us", "u.s.", "united states", "america", "uk",
  "united kingdom", "england", "britain", "germany", "france", "canada", "ireland",
  "netherlands", "australia", "singapore", "japan", "remote", "hybrid", "onsite",
  "anywhere", "worldwide", "global", "emea", "apac", "latam", "europe", "asia",
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

export type LocationAffinityInput = {
  jobLocation?: string | null;
  jobCountry?: string | null;
  remoteStatus?: string | null;
  /** Posting text — used to detect geo-restricted remote ("US only"). */
  description?: string | null;
  preferred: Array<string | null | undefined>;
};

/** Candidate's own country code, resolved from their preferred locations. */
function candidateCountry(prefs: Array<string | null | undefined>): string | null {
  for (const p of prefs) {
    const c = resolveCountryCode(p);
    if (c) return c;
  }
  return null;
}

/**
 * Country a remote posting is restricted to, or null when worldwide.
 * Reads the structured columns first, then scans the posting text for
 * "<country> only" / "must be based in <country>" / "authorized to work in".
 */
export function remoteRestriction(input: LocationAffinityInput): string | null {
  const structured = `${input.jobLocation ?? ""} , ${input.jobCountry ?? ""}`;
  const structuredGeo = resolveGeo(structured);
  if (structuredGeo.countryCode) return structuredGeo.countryCode;
  if (structuredGeo.worldwide) return null;

  const blob = (input.description ?? "").slice(0, 2000).toLowerCase();
  if (!blob) return null;
  if (/\b(worldwide|anywhere in the world|fully distributed|any location)\b/.test(blob)) return null;
  const m = blob.match(
    /\b(?:only|based in|located in|reside in|residents of|authorized to work in|eligible to work in|work authorization in)\b[^.]{0,60}/,
  );
  const window =
    blob.match(/\b([a-z .]{2,24})\s+(?:only|based|residents|applicants only)\b/)?.[1] ?? m?.[0] ?? "";
  const code = resolveCountryCode(window);
  return code;
}

/** Macro region of a posting. */
function jobRegion(input: LocationAffinityInput): Region {
  return resolveGeo(`${input.jobLocation ?? ""} , ${input.jobCountry ?? ""}`).region;
}

export function locationAffinity(input: LocationAffinityInput): number {
  const prefs = input.preferred.map(norm).filter(Boolean);
  const jobText = norm(`${input.jobLocation ?? ""} ${input.jobCountry ?? ""}`);
  const remote = (input.remoteStatus ?? "").toLowerCase();
  const prefCountry = candidateCountry(input.preferred);

  const wantsRemote = prefs.some((p) => p.includes("remote") || p.includes("anywhere"));
  if (remote === "remote") {
    // A remote role restricted to another country is NOT globally remote for
    // this candidate — an India-based user cannot take a "Remote (US only)"
    // job, so it must never rank like an India-remote role.
    const restrictedTo = remoteRestriction(input);
    if (restrictedTo && prefCountry) {
      if (restrictedTo === prefCountry) return 1;
      const sameRegion = resolveGeo(restrictedTo).region === resolveGeo(prefCountry).region;
      return sameRegion ? 0.4 : 0.22;
    }
    if (restrictedTo && !prefCountry) return 0.6;
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

  const jobCountry = resolveCountryCode(jobText);
  if (jobCountry && prefCountry && jobCountry === prefCountry) return 0.8;
  if (jobCountry && prefCountry) {
    // Different country: same macro region is still far more plausible than
    // a different continent (relocation/timezone reality).
    const sameRegion = jobRegion(input) === resolveGeo(prefCountry).region;
    if (sameRegion) return remote === "hybrid" ? 0.42 : 0.36;
    return remote === "hybrid" ? 0.2 : 0.12;
  }

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

/** True when a posting is located in India (or explicitly India-remote). */
export function isIndiaJob(location?: string | null, country?: string | null): boolean {
  return isIndiaText(location, country);
}

/** True when the candidate's own location/preferences point at India. */
export function candidateIsIndian(preferred: Array<string | null | undefined>): boolean {
  return preferred.some((p) => isIndiaText(p));
}

export type ProximityTier =
  | "same-city"
  | "nearby-city"
  | "same-country"
  | "same-region"
  | "remote"
  | "far";

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
  const prefCountry = candidateCountry(input.preferred);

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

  if (remote === "remote") {
    const restrictedTo = remoteRestriction(input);
    if (restrictedTo && prefCountry && restrictedTo !== prefCountry) {
      return { score: base, tier: "far", label: `Remote (${restrictedTo} only)` };
    }
    return { score: base, tier: "remote", label: "Remote" };
  }

  const jobCountry = resolveCountryCode(jobText);
  if (jobCountry && prefCountry && jobCountry === prefCountry) {
    return { score: Math.max(base, 0.8), tier: "same-country", label: "In your country" };
  }
  if (jobCountry && prefCountry && jobRegion(input) === resolveGeo(prefCountry).region) {
    return { score: base, tier: "same-region", label: "Same region" };
  }

  return { score: base, tier: "far", label: null };
}
