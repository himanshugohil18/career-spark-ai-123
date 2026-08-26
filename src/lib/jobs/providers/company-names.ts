/**
 * Company identity for ATS-hosted boards.
 *
 * ATS public APIs (Greenhouse / Lever / Ashby) identify a company only by its
 * board slug, so the display name has to be derived. A naive title-case of the
 * slug produces wrong brands ("Openai", "Scaleai", "Dbtlabs"), which makes a
 * catalog of real jobs look machine-generated. This module is the single source
 * of truth for turning a board slug into a correct brand name, website and
 * logo.
 *
 * Pure + isomorphic: safe to import from providers, server code and the UI.
 */

type CompanyIdentity = { name: string; domain?: string };

/** Explicit overrides for boards whose brand differs from the slug. */
const OVERRIDES: Record<string, CompanyIdentity> = {
  openai: { name: "OpenAI", domain: "openai.com" },
  anthropic: { name: "Anthropic", domain: "anthropic.com" },
  scaleai: { name: "Scale AI", domain: "scale.com" },
  shieldai: { name: "Shield AI", domain: "shield.ai" },
  factoryai: { name: "Factory AI", domain: "factory.ai" },
  fireworksai: { name: "Fireworks AI", domain: "fireworks.ai" },
  assemblyai: { name: "AssemblyAI", domain: "assemblyai.com" },
  mongodb: { name: "MongoDB", domain: "mongodb.com" },
  gitlab: { name: "GitLab", domain: "gitlab.com" },
  github: { name: "GitHub", domain: "github.com" },
  gitpod: { name: "Gitpod", domain: "gitpod.io" },
  dbtlabs: { name: "dbt Labs", domain: "getdbt.com" },
  grafanalabs: { name: "Grafana Labs", domain: "grafana.com" },
  lambdalabs: { name: "Lambda Labs", domain: "lambdalabs.com" },
  weightsandbiases: { name: "Weights & Biases", domain: "wandb.ai" },
  hashicorp: { name: "HashiCorp", domain: "hashicorp.com" },
  cockroachlabs: { name: "Cockroach Labs", domain: "cockroachlabs.com" },
  posthog: { name: "PostHog", domain: "posthog.com" },
  runwayml: { name: "Runway", domain: "runwayml.com" },
  browserbasehq: { name: "Browserbase", domain: "browserbase.com" },
  llamaindex: { name: "LlamaIndex", domain: "llamaindex.ai" },
  langchain: { name: "LangChain", domain: "langchain.com" },
  moderntreasury: { name: "Modern Treasury", domain: "moderntreasury.com" },
  sigmacomputing: { name: "Sigma Computing", domain: "sigmacomputing.com" },
  temporaltechnologies: { name: "Temporal", domain: "temporal.io" },
  matchgroup: { name: "Match Group", domain: "mtch.com" },
  lucidmotors: { name: "Lucid Motors", domain: "lucidmotors.com" },
  cloudkitchens: { name: "CloudKitchens", domain: "cloudkitchens.com" },
  fetchrewards: { name: "Fetch", domain: "fetch.com" },
  thoughtspot: { name: "ThoughtSpot", domain: "thoughtspot.com" },
  swiftnav: { name: "Swift Navigation", domain: "swiftnav.com" },
  vestiaire: { name: "Vestiaire Collective", domain: "vestiairecollective.com" },
  wellfound: { name: "Wellfound", domain: "wellfound.com" },
  angellist: { name: "AngelList", domain: "angellist.com" },
  huggingface: { name: "Hugging Face", domain: "huggingface.co" },
  smartsheet: { name: "Smartsheet", domain: "smartsheet.com" },
  tripadvisor: { name: "Tripadvisor", domain: "tripadvisor.com" },
  zocdoc: { name: "Zocdoc", domain: "zocdoc.com" },
  khanacademy: { name: "Khan Academy", domain: "khanacademy.org" },
  paytm: { name: "Paytm", domain: "paytm.com" },
  razorpay: { name: "Razorpay", domain: "razorpay.com" },
  zetaindia: { name: "Zeta", domain: "zeta.tech" },
  meesho: { name: "Meesho", domain: "meesho.com" },
  swiggy: { name: "Swiggy", domain: "swiggy.com" },
  cred: { name: "CRED", domain: "cred.club" },
  browserstack: { name: "BrowserStack", domain: "browserstack.com" },
  postman: { name: "Postman", domain: "postman.com" },
  freshworks: { name: "Freshworks", domain: "freshworks.com" },
  zoho: { name: "Zoho", domain: "zoho.com" },
  chargebee: { name: "Chargebee", domain: "chargebee.com" },
  hasura: { name: "Hasura", domain: "hasura.io" },
  innovaccer: { name: "Innovaccer", domain: "innovaccer.com" },
  groww: { name: "Groww", domain: "groww.in" },
  zepto: { name: "Zepto", domain: "zeptonow.com" },
  urbancompany: { name: "Urban Company", domain: "urbancompany.com" },
};

/** Tokens that must keep a fixed casing when title-casing a slug. */
const CASING: Record<string, string> = {
  ai: "AI",
  ml: "ML",
  api: "API",
  hq: "HQ",
  io: "IO",
  hr: "HR",
  it: "IT",
  ux: "UX",
};

/** Human brand name for an ATS board slug. */
export function companyDisplayName(slug: string): string {
  const key = String(slug ?? "").trim().toLowerCase();
  if (!key) return "";
  const override = OVERRIDES[key];
  if (override) return override.name;
  return key
    .replace(/[_.]+/g, "-")
    .split("-")
    .filter(Boolean)
    .map((word) => CASING[word] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Known corporate website for a board slug, when we can state it factually. */
export function companyDomain(slug: string): string | null {
  return OVERRIDES[String(slug ?? "").trim().toLowerCase()]?.domain ?? null;
}

/** Logo URL derived from a known domain — never a placeholder image. */
export function companyLogoUrl(slug: string): string | null {
  const domain = companyDomain(slug);
  return domain ? `https://logo.clearbit.com/${domain}` : null;
}

export function companyWebsite(slug: string): string | null {
  const domain = companyDomain(slug);
  return domain ? `https://${domain}` : null;
}
