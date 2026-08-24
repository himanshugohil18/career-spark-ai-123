/**
 * Company / ATS board registry.
 *
 * These are the DEFAULT company boards CareerOS crawls for each supported ATS.
 * `job_sources.config.boards` / `.companies` is merged on top of these lists,
 * so ops can add companies without a code change and adding a new company here
 * requires no change to the discovery pipeline.
 *
 * Boards that no longer exist simply return 404 and are skipped by the
 * provider, so a stale slug can never corrupt the catalog.
 */

/** Greenhouse board slugs — https://boards-api.greenhouse.io/v1/boards/{slug} */
export const GREENHOUSE_BOARDS: string[] = [
  // originals
  "stripe", "airbnb", "notion", "figma", "vercel", "openai", "anthropic",
  "cloudflare", "gitlab", "dropbox", "reddit", "instacart", "doordash", "brex",
  "ramp", "plaid", "retool", "linear", "posthog", "datadog", "hashicorp",
  "snowflake", "discord", "supabase", "render",
  // expansion — large + mid-size engineering employers on Greenhouse
  "coinbase", "databricks", "robinhood", "asana", "duolingo", "grammarly",
  "mongodb", "elastic", "twilio", "samsara", "affirm", "gusto", "lattice",
  "amplitude", "sourcegraph", "temporaltechnologies", "webflow", "zapier",
  "flexport", "faire", "patreon", "thumbtack", "udemy", "unity", "upstart",
  "verkada", "zocdoc", "benchling", "chime", "airtable", "cockroachlabs",
  "confluent", "dbtlabs", "deel", "fivetran", "gopuff", "grafanalabs",
  "gong", "hex", "instabase", "khanacademy", "matterport", "mural",
  "nuro", "peloton", "pilot", "quora", "rippling", "scaleai", "sentry",
  "sigmacomputing", "smartsheet", "sonder", "starburst", "strava",
  "stytch", "superhuman", "tecton", "tripadvisor", "vanta", "veed",
  "wealthfront", "whatnot", "wiz", "zipline",
];

/** Lever company slugs — https://api.lever.co/v0/postings/{slug} */
export const LEVER_COMPANIES: string[] = [
  // originals
  "netflix", "spotify", "shopify", "palantir", "mercury", "medium",
  "huggingface", "attio", "ramp", "attn", "angellist", "substack",
  "robinhood", "opendoor", "doordash", "segment", "checkr", "kickstarter",
  // expansion
  "leverdemo", "voleon", "matchgroup", "kojo", "cabify", "vimeo",
  "brightwheel", "cloudkitchens", "eightfold", "fetchrewards", "gitpod",
  "hopper", "kong", "lucidmotors", "mistral", "moveworks", "nubank",
  "quantcast", "recharge", "replit", "sardine", "scribd", "shieldai",
  "sift", "sigmoid", "swiftnav", "talkdesk", "thoughtspot", "trellix",
  "turing", "twitch", "upgrade", "veriff", "vestiaire", "wander",
  "wefox", "zego", "zwift",
];

/** Ashby organisation slugs — https://api.ashbyhq.com/posting-api/job-board/{slug} */
export const ASHBY_COMPANIES: string[] = [
  // originals
  "ramp", "openai", "linear", "notion", "posthog", "runwayml", "perplexity",
  "attio", "warp", "vercel", "modal", "supabase", "clerk", "render", "turso",
  "browserbasehq", "factoryai", "cursor",
  // expansion
  "elevenlabs", "deepgram", "harvey", "sierra", "cohere", "together",
  "weightsandbiases", "langchain", "resend", "neon", "prisma", "railway",
  "fly", "hex", "mintlify", "granola", "gamma", "raycast", "arc",
  "polymarket", "mercor", "sardine", "unify", "decagon", "abridge",
  "codeium", "baseten", "fireworksai", "lambdalabs", "groq", "hume",
  "assemblyai", "pinecone", "chroma", "weaviate", "llamaindex",
  "cresta", "moderntreasury", "unit", "column", "increase", "highnote",
];

/**
 * Registry map used by the ATS providers. Adding a new ATS means adding one
 * entry here plus one provider module — the core job system is untouched.
 */
export const ATS_DEFAULT_BOARDS: Record<string, string[]> = {
  greenhouse: GREENHOUSE_BOARDS,
  lever: LEVER_COMPANIES,
  ashby: ASHBY_COMPANIES,
};

/** Merge configured slugs with registry defaults, de-duplicated and stable. */
export function mergeBoards(configured: string[] | undefined, defaults: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of [...defaults, ...(configured ?? [])]) {
    const s = String(slug ?? "").trim();
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  return out;
}
