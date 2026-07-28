/**
 * Search-location expansion for query-first providers.
 *
 * Product rule: CareerOS is India-first, then global. Every marketplace /
 * portal adapter searches the user's own preferred locations first, then the
 * major Indian hiring metros, then remote + the biggest global markets — so
 * the shared pool always has depth in India before it widens worldwide.
 */

const INDIA_METROS = [
  "India",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "Delhi NCR",
  "Chennai",
  "Ahmedabad",
  "Noida",
  "Gurgaon",
];

const GLOBAL_MARKETS = [
  "Remote",
  "United States",
  "United Kingdom",
  "Germany",
  "Canada",
  "Singapore",
  "Australia",
  "United Arab Emirates",
];

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
  }
  return out;
}

/**
 * @param preferred user/profile locations (highest priority)
 * @param max how many search locations the provider should hit
 */
export function expandSearchLocations(preferred: string[] | undefined, max = 6): string[] {
  return dedupe([...(preferred ?? []), ...INDIA_METROS, ...GLOBAL_MARKETS]).slice(0, max);
}

export { INDIA_METROS, GLOBAL_MARKETS };
