/**
 * Job preference vocabulary + types. Client-safe (no I/O), shared by the
 * preferences UI, the feed ranker and the matching engine.
 */

export type WorkMode = "remote" | "hybrid" | "onsite";

export type JobPreferences = {
  preferredRoles: string[];
  preferredLocations: string[];
  preferredCountries: string[];
  preferredRegions: string[];
  workModes: WorkMode[];
  experienceLevels: string[];
  employmentTypes: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: "month" | "year";
  willingToRelocate: boolean;
  openToInternational: boolean;
  includeStretch: boolean;
  strictSalaryFilter: boolean;
};

export const DEFAULT_JOB_PREFERENCES: JobPreferences = {
  preferredRoles: [],
  preferredLocations: [],
  preferredCountries: [],
  preferredRegions: [],
  workModes: [],
  experienceLevels: [],
  employmentTypes: [],
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: "INR",
  salaryPeriod: "year",
  willingToRelocate: false,
  openToInternational: false,
  includeStretch: true,
  strictSalaryFilter: false,
};

/** India tech + employment hubs offered in the location picker. */
export const INDIA_HUBS = [
  "Bengaluru", "Pune", "Hyderabad", "Chennai", "Ahmedabad", "Mumbai", "Navi Mumbai",
  "Gurugram", "Delhi", "Noida", "Mohali", "Chandigarh", "Kolkata", "Kochi",
  "Coimbatore", "Jaipur", "Indore", "Vadodara", "Surat", "Thiruvananthapuram",
  "Bhubaneswar", "Visakhapatnam", "Nagpur", "Lucknow", "Gandhinagar", "Mysuru",
];

export type RegionId =
  | "north-america"
  | "latin-america"
  | "europe"
  | "asia"
  | "middle-east"
  | "oceania"
  | "africa";

export const REGIONS: Array<{ id: RegionId; label: string; countries: string[] }> = [
  { id: "north-america", label: "North America", countries: ["united states", "usa", "canada", "u.s.", "us"] },
  { id: "latin-america", label: "Latin America", countries: ["mexico", "brazil", "argentina", "chile", "colombia", "peru", "uruguay", "costa rica"] },
  {
    id: "europe",
    label: "Europe",
    countries: [
      "united kingdom", "uk", "england", "ireland", "germany", "netherlands", "france",
      "spain", "portugal", "italy", "switzerland", "austria", "belgium", "poland",
      "sweden", "norway", "denmark", "finland", "estonia", "czech republic", "romania",
    ],
  },
  {
    id: "asia",
    label: "Asia",
    countries: ["india", "singapore", "japan", "south korea", "malaysia", "indonesia", "philippines", "vietnam", "thailand", "china", "hong kong", "taiwan"],
  },
  { id: "middle-east", label: "Middle East", countries: ["uae", "united arab emirates", "dubai", "abu dhabi", "saudi arabia", "qatar", "israel", "bahrain", "kuwait", "oman"] },
  { id: "oceania", label: "Australia & Oceania", countries: ["australia", "new zealand"] },
  { id: "africa", label: "Africa", countries: ["south africa", "nigeria", "kenya", "egypt", "morocco", "ghana"] },
];

const REGION_BY_COUNTRY = new Map<string, RegionId>();
for (const r of REGIONS) for (const c of r.countries) REGION_BY_COUNTRY.set(c, r.id);

/** Resolve the world region for a free-text location/country string. */
export function regionFor(location?: string | null, country?: string | null): RegionId | null {
  const text = `${country ?? ""} ${location ?? ""}`.toLowerCase();
  if (!text.trim()) return null;
  // Longest country names first so "united states" beats "us".
  const keys = [...REGION_BY_COUNTRY.keys()].sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (key.length <= 3) {
      if (new RegExp(`\\b${key}\\b`).test(text)) return REGION_BY_COUNTRY.get(key)!;
    } else if (text.includes(key)) {
      return REGION_BY_COUNTRY.get(key)!;
    }
  }
  return null;
}

export function regionLabel(id: RegionId | null): string | null {
  return REGIONS.find((r) => r.id === id)?.label ?? null;
}

// ---------------------------------------------------------------------------
// Remote geographic eligibility
// ---------------------------------------------------------------------------

export type RemoteEligibility = {
  /** true when the posting is remote in any form. */
  remote: boolean;
  /** Explicit geographic restriction, lower-cased ("united states", "india"). */
  restrictedTo: string | null;
  /** Region the restriction resolves to, if any. */
  restrictedRegion: RegionId | null;
  /** true when the remote posting has no stated geographic restriction. */
  worldwide: boolean;
  label: string;
};

const RESTRICTION_PATTERNS: Array<[RegExp, string]> = [
  [/\b(us|u\.s\.|usa|united states)[- ]?(only|based|residents?)\b/i, "united states"],
  [/\bremote\s*[-—(,]*\s*(us|u\.s\.|usa|united states)\b/i, "united states"],
  [/\b(india)[- ]?(only|based|residents?)\b/i, "india"],
  [/\bremote\s*[-—(,]*\s*india\b/i, "india"],
  [/\b(uk|united kingdom)[- ]?(only|based|residents?)\b/i, "united kingdom"],
  [/\b(canada)[- ]?(only|based|residents?)\b/i, "canada"],
  [/\b(emea|europe)[- ]?(only|based)\b/i, "europe"],
  [/\bremote\s*[-—(,]*\s*(emea|europe)\b/i, "europe"],
  [/\b(apac)[- ]?(only|based)\b/i, "asia"],
  [/\b(australia)[- ]?(only|based|residents?)\b/i, "australia"],
  [/\b(germany|netherlands|singapore|ireland|poland|brazil|mexico)[- ]?(only|based|residents?)\b/i, ""],
];

/**
 * Determine whether a remote posting actually accepts candidates from the
 * user's country. A "Remote — US only" job must not be recommended to an
 * India-based candidate unless they opted into international roles.
 */
export function remoteEligibility(args: {
  remoteStatus?: string | null;
  location?: string | null;
  locationCountry?: string | null;
  description?: string | null;
}): RemoteEligibility {
  const remote = (args.remoteStatus ?? "").toLowerCase() === "remote";
  const blob = `${args.location ?? ""} ${args.locationCountry ?? ""} ${(args.description ?? "").slice(0, 1200)}`;
  if (!remote) {
    return { remote: false, restrictedTo: null, restrictedRegion: null, worldwide: false, label: "" };
  }
  if (/\b(worldwide|anywhere|global(ly)?|any location|work from anywhere)\b/i.test(blob)) {
    return { remote: true, restrictedTo: null, restrictedRegion: null, worldwide: true, label: "Remote — worldwide" };
  }
  for (const [re, country] of RESTRICTION_PATTERNS) {
    const m = blob.match(re);
    if (m) {
      const resolved = country || (m[1] ?? "").toLowerCase();
      const region = resolved === "europe" || resolved === "asia" ? (resolved as RegionId) : regionFor(null, resolved);
      return {
        remote: true,
        restrictedTo: resolved,
        restrictedRegion: region,
        worldwide: false,
        label: `Remote — ${titleCase(resolved)} only`,
      };
    }
  }
  // Remote with a stated country and no "only" phrasing: treat the country as
  // a soft restriction rather than worldwide.
  const country = (args.locationCountry ?? "").toLowerCase().trim();
  if (country) {
    return {
      remote: true,
      restrictedTo: country,
      restrictedRegion: regionFor(null, country),
      worldwide: false,
      label: `Remote — ${titleCase(country)}`,
    };
  }
  return { remote: true, restrictedTo: null, restrictedRegion: null, worldwide: true, label: "Remote" };
}

/** Can a candidate in `candidateCountry` take this remote posting? */
export function remoteAllows(eligibility: RemoteEligibility, candidateCountry: string | null): boolean {
  if (!eligibility.remote) return true;
  if (eligibility.worldwide || !eligibility.restrictedTo) return true;
  if (!candidateCountry) return true;
  const c = candidateCountry.toLowerCase();
  if (eligibility.restrictedTo === c) return true;
  const candidateRegion = regionFor(null, c);
  return !!candidateRegion && candidateRegion === eligibility.restrictedRegion;
}

function titleCase(v: string): string {
  return v.replace(/\b[a-z]/g, (m) => m.toUpperCase());
}

// ---------------------------------------------------------------------------
// Salary display
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOL: Record<string, string> = {
  INR: "₹", USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$", SGD: "S$",
  AED: "AED ", JPY: "¥", CHF: "CHF ", SEK: "SEK ", NZD: "NZ$", ZAR: "R",
};

/** Approximate units of the currency per 1 INR is inverted: INR per 1 unit. */
export const INR_PER_UNIT: Record<string, number> = {
  USD: 88, EUR: 96, GBP: 112, AUD: 58, CAD: 64, SGD: 66, AED: 24, JPY: 0.58,
  CHF: 103, SEK: 8.4, NZD: 53, ZAR: 4.8, INR: 1,
};

export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined,
  period: string | null | undefined = "year",
): string {
  if (!min && !max) return "Salary not disclosed";
  const code = (currency ?? "USD").toUpperCase();
  const sym = CURRENCY_SYMBOL[code] ?? `${code} `;
  const per = period === "month" ? "/mo" : "/yr";
  const fmt = (n: number) => {
    if (code === "INR") {
      if (n >= 100000) return `${sym}${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} LPA`;
      return `${sym}${Math.round(n).toLocaleString("en-IN")}`;
    }
    if (n >= 1000) return `${sym}${Math.round(n / 1000)}k`;
    return `${sym}${Math.round(n).toLocaleString()}`;
  };
  const body = min && max ? `${fmt(min)} – ${fmt(max)}` : fmt((max ?? min)!);
  return code === "INR" && /LPA/.test(body) ? body : `${body}${per}`;
}

/** Approximate INR equivalent, clearly marked as approximate by the caller. */
export function approxInr(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  const code = (currency ?? "").toUpperCase();
  if (!amount || !code || code === "INR") return null;
  const rate = INR_PER_UNIT[code];
  if (!rate) return null;
  const inr = amount * rate;
  if (inr >= 10000000) return `≈ ₹${(inr / 10000000).toFixed(1)} Cr/yr`;
  return `≈ ₹${(inr / 100000).toFixed(1)} lakh/yr`;
}
