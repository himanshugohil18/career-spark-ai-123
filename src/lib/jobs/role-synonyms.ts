/**
 * Role family + technology intelligence.
 *
 * The Career Brain and the job's title/tech stack are projected into a
 * small set of ROLE_FAMILIES. Matching then reasons over families instead
 * of raw string overlap, so "DevOps Engineer" pulls in SRE / Platform /
 * Kubernetes / Cloud roles while pushing Sales / Marketing / HR / Finance
 * to the very bottom (or filtering them out entirely).
 *
 * A separate TECH_GRAPH lets us treat Docker/K8s/EKS/Terraform/Helm/ArgoCD
 * as a single semantic cluster rather than isolated keywords.
 *
 * Pure functions — no I/O, no AI.
 */

export type RoleFamily = {
  /** Stable id — used for empty-state copy and cross-family compatibility. */
  id: string;
  /** Human label. */
  label: string;
  /** Broad career track (used for hard cross-track penalties). */
  track: "engineering" | "data" | "design" | "product" | "business" | "operations";
  /** Tokens that identify the family in a title (lowercased). */
  tokens: string[];
  /** Adjacent / synonymous role titles for OR ilike expansion. */
  synonyms: string[];
  /** Technology cluster ids that strongly imply this family. */
  techClusters?: string[];
  /** Related families that are also acceptable matches. */
  related?: string[];
};

export const ROLE_FAMILIES: RoleFamily[] = [
  {
    id: "devops",
    label: "DevOps & Platform",
    track: "engineering",
    tokens: [
      "devops", "sre", "site reliability", "platform", "infrastructure",
      "cloud engineer", "cloud platform", "kubernetes", "k8s",
      "build and release", "release engineer", "production engineer",
      "infrastructure automation", "linux engineer", "aws engineer",
      "terraform engineer", "cloud infrastructure", "platform reliability",
      "devsecops", "ci/cd", "cicd", "gitops", "cloud operations",
    ],
    synonyms: [
      "devops engineer", "senior devops engineer", "staff devops engineer",
      "site reliability engineer", "sre", "senior sre", "staff sre",
      "platform engineer", "senior platform engineer", "staff platform engineer",
      "infrastructure engineer", "senior infrastructure engineer",
      "cloud engineer", "cloud platform engineer", "cloud operations engineer",
      "cloud infrastructure engineer", "aws engineer", "terraform engineer",
      "kubernetes engineer", "kubernetes platform engineer",
      "platform reliability engineer", "production engineer",
      "build and release engineer", "release engineer",
      "infrastructure automation engineer", "linux engineer",
      "devsecops engineer", "ci/cd engineer", "cicd engineer",
    ],
    techClusters: ["cloud", "containers", "iac", "cicd", "observability", "linux"],
    related: ["backend", "security", "data"],
  },
  {
    id: "frontend",
    label: "Frontend",
    track: "engineering",
    tokens: [
      "frontend", "front-end", "front end", "ui engineer", "web engineer",
      "react", "vue", "angular", "svelte", "next.js", "typescript engineer",
      "javascript engineer", "frontend developer", "front-end developer", "front end developer",
      "ui developer", "web developer", "react developer", "react.js developer",
      "nextjs developer", "next.js developer", "javascript developer", "typescript developer",
    ],
    synonyms: [
      "frontend engineer", "senior frontend engineer", "staff frontend engineer",
      "front-end engineer", "front end engineer",
      "react engineer", "react developer", "vue engineer", "angular engineer",
      "ui engineer", "web engineer", "javascript engineer", "typescript engineer",
      "next.js engineer", "web platform engineer", "client engineer",
      "frontend developer", "front-end developer", "front end developer",
      "ui developer", "web developer", "javascript developer", "typescript developer",
      "react.js developer", "nextjs developer", "next.js developer",
    ],
    techClusters: ["frontend", "web"],
    related: ["fullstack", "design"],
  },
  {
    id: "backend",
    label: "Backend",
    track: "engineering",
    tokens: [
      "backend", "back-end", "back end", "api engineer", "server engineer",
      "node engineer", "python engineer", "golang", "go engineer",
      "rust engineer", "java engineer", "kotlin engineer", "scala engineer",
      "ruby engineer", "distributed systems", "microservices", "backend developer",
      "back-end developer", "api developer", "server developer", "node developer",
      "node.js developer", "nodejs developer", "express developer",
    ],
    synonyms: [
      "backend engineer", "senior backend engineer", "staff backend engineer",
      "back-end engineer", "server engineer", "api engineer",
      "node engineer", "python engineer", "go engineer", "golang engineer",
      "java engineer", "rust engineer", "ruby engineer",
      "distributed systems engineer", "microservices engineer",
      "server-side engineer",
      "backend developer", "back-end developer", "api developer",
      "node developer", "node.js developer", "nodejs developer", "express developer",
    ],
    techClusters: ["backend", "databases", "cloud"],
    related: ["fullstack", "devops", "data"],
  },
  {
    id: "fullstack",
    label: "Full-stack",
    track: "engineering",
    tokens: [
      "full stack", "full-stack", "fullstack", "mern", "mern stack",
      "mean stack", "react node", "node react",
    ],
    synonyms: [
      "full-stack engineer", "fullstack engineer", "full stack engineer",
      "senior full stack engineer", "staff full stack engineer",
      "full-stack developer", "fullstack developer", "full stack developer",
      "mern stack developer", "mern developer", "mean stack developer",
      "react node developer", "node react developer",
    ],
    techClusters: ["frontend", "backend"],
    related: ["frontend", "backend"],
  },
  {
    id: "mobile",
    label: "Mobile",
    track: "engineering",
    tokens: [
      "ios engineer", "android engineer", "mobile engineer",
      "react native", "flutter", "swift engineer", "kotlin engineer",
    ],
    synonyms: [
      "ios engineer", "senior ios engineer", "android engineer",
      "senior android engineer", "mobile engineer", "senior mobile engineer",
      "react native engineer", "flutter engineer",
    ],
    techClusters: ["mobile"],
    related: ["frontend", "fullstack"],
  },
  {
    id: "data",
    label: "Data Engineering",
    track: "data",
    tokens: [
      "data engineer", "analytics engineer", "big data", "etl engineer",
      "data platform", "data infrastructure", "spark", "airflow", "dbt",
      "warehouse", "streaming engineer",
    ],
    synonyms: [
      "data engineer", "senior data engineer", "staff data engineer",
      "analytics engineer", "etl engineer", "big data engineer",
      "data platform engineer", "data infrastructure engineer",
      "streaming data engineer",
    ],
    techClusters: ["data", "cloud"],
    related: ["backend", "ml", "devops"],
  },
  {
    id: "ml",
    label: "Machine Learning",
    track: "data",
    tokens: [
      "machine learning", "ml engineer", "ai engineer", "mlops",
      "deep learning", "nlp engineer", "computer vision",
      "applied scientist", "research engineer", "llm engineer",
      "generative ai", "genai", "gen ai",
      "ai platform", "ml platform", "ai infrastructure", "ml infrastructure",
      "ai/ml", "ml/ai",
      "model deployment", "models deployment", "model serving",
      "inference engineer", "inference platform",
      "foundation model", "diffusion", "transformer",
      "agentic ai", "ai agent", "ai agents", "rag", "retrieval augmented generation",
      "prompt engineer", "ai application", "ai product engineer",
    ],
    synonyms: [
      "machine learning engineer", "senior ml engineer", "staff ml engineer",
      "ai engineer", "senior ai engineer",
      "mlops engineer", "applied scientist", "research engineer",
      "computer vision engineer", "nlp engineer", "llm engineer",
      "generative ai engineer", "genai engineer",
      "ai platform engineer", "ml platform engineer",
      "ai infrastructure engineer", "ml infrastructure engineer",
      "model deployment engineer", "models deployment engineer",
      "model serving engineer", "inference engineer",
      "agentic ai engineer", "ai agent engineer", "rag engineer",
      "ai application engineer", "ai product engineer",
    ],
    techClusters: ["ml", "data", "python"],
    related: ["data", "backend"],
  },
  {
    id: "datascience",
    label: "Data Science",
    track: "data",
    tokens: [
      "data scientist", "data science", "quantitative analyst",
      "statistician", "analytics scientist", "decision scientist",
    ],
    synonyms: [
      "data scientist", "senior data scientist", "staff data scientist",
      "applied data scientist", "quantitative analyst", "decision scientist",
    ],
    techClusters: ["ml", "python", "data"],
    related: ["ml", "data"],
  },
  {
    id: "security",
    label: "Security",
    track: "engineering",
    tokens: [
      "security engineer", "appsec", "infosec", "cybersecurity",
      "penetration tester", "product security", "cloud security",
      "detection engineer", "offensive security",
    ],
    synonyms: [
      "security engineer", "senior security engineer",
      "application security engineer", "cloud security engineer",
      "product security engineer", "detection engineer",
      "offensive security engineer", "penetration tester",
      "cybersecurity engineer",
    ],
    techClusters: ["security", "cloud"],
    related: ["devops", "backend"],
  },
  {
    id: "product",
    label: "Product Management",
    track: "product",
    tokens: [
      "product manager", "product management", "product owner",
      "technical product manager", "group product manager",
    ],
    synonyms: [
      "product manager", "senior product manager", "group product manager",
      "technical product manager", "product owner",
      "director of product", "principal product manager",
    ],
    related: ["design"],
  },
  {
    id: "design",
    label: "Design",
    track: "design",
    tokens: [
      "designer", "product designer", "ux designer", "ui designer",
      "visual designer", "design engineer", "design lead",
    ],
    synonyms: [
      "product designer", "senior product designer", "ux designer",
      "senior ux designer", "ui designer", "visual designer",
      "design engineer", "design lead", "director of design",
    ],
    related: ["frontend", "product"],
  },
  {
    id: "qa",
    label: "QA & Test Engineering",
    track: "engineering",
    tokens: [
      "qa engineer", "test engineer", "sdet", "quality engineer",
      "quality assurance",
    ],
    synonyms: [
      "qa engineer", "test engineer", "sdet",
      "quality engineer", "quality automation engineer",
      "test automation engineer",
    ],
    related: ["devops", "backend"],
  },
  // ---- Non-engineering families used mostly for HARD PENALTIES ----
  {
    id: "sales",
    label: "Sales",
    track: "business",
    tokens: [
      "sales", "account executive", "account manager",
      "business development", "bdr", "sdr", "sales representative",
      "revenue operations",
    ],
    synonyms: [
      "account executive", "sales manager", "sales director",
      "business development representative", "sales development representative",
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    track: "business",
    tokens: [
      "marketing", "growth marketer", "seo specialist",
      "content marketing", "brand manager", "demand generation",
    ],
    synonyms: [
      "marketing manager", "growth manager", "content marketer",
      "brand manager", "seo specialist", "demand generation manager",
    ],
  },
  {
    id: "people",
    label: "People & HR",
    track: "operations",
    tokens: [
      "people operations", "human resources", "hr business partner",
      "recruiter", "talent acquisition", "recruiting",
    ],
    synonyms: [
      "people operations manager", "hr business partner",
      "recruiter", "technical recruiter", "talent acquisition partner",
    ],
  },
  {
    id: "finance",
    label: "Finance",
    track: "business",
    tokens: [
      "finance", "accountant", "controller", "financial analyst",
      "treasury", "fp&a",
    ],
    synonyms: [
      "financial analyst", "accountant", "controller",
      "fp&a analyst", "finance manager",
    ],
  },
  {
    id: "customer",
    label: "Customer Success",
    track: "operations",
    tokens: [
      "customer success", "customer support", "customer experience",
      "solutions engineer", "solutions architect",
    ],
    synonyms: [
      "customer success manager", "customer support engineer",
      "solutions engineer", "solutions architect",
    ],
  },
];

/**
 * Semantic technology clusters. A skill/tech string is looked up here to
 * decide which cluster(s) it belongs to. Matching then computes overlap at
 * the CLUSTER level, not the string level, so "K8s" == "kubernetes" ==
 * "amazon eks" all count as containers.
 */
export const TECH_GRAPH: Record<string, string[]> = {
  cloud: [
    "aws", "amazon web services", "gcp", "google cloud", "azure",
    "cloudfront", "s3", "ec2", "lambda", "rds", "route53",
    "cloudformation", "sagemaker",
  ],
  containers: [
    "docker", "containerization", "container", "podman",
    "kubernetes", "k8s", "eks", "amazon eks", "gke", "aks",
    "helm", "helmfile", "istio", "linkerd", "service mesh",
    "openshift", "rancher",
  ],
  iac: [
    "terraform", "iac", "infrastructure as code", "pulumi",
    "cloudformation", "cdk", "ansible", "chef", "puppet", "packer",
  ],
  cicd: [
    "ci/cd", "cicd", "jenkins", "github actions", "gitlab ci",
    "circleci", "argocd", "argo cd", "gitops", "flux", "spinnaker",
    "tekton", "buildkite", "teamcity",
  ],
  observability: [
    "prometheus", "grafana", "datadog", "new relic", "splunk",
    "elk", "elasticsearch", "kibana", "loki", "opentelemetry",
    "otel", "jaeger", "sentry", "pagerduty",
  ],
  linux: [
    "linux", "bash", "shell", "unix", "systemd", "networking",
    "tcp/ip", "dns", "nginx", "haproxy", "iptables",
  ],
  security: [
    "security", "iam", "oauth", "vault", "hashicorp vault", "kms",
    "sso", "zero trust", "penetration testing", "burp suite",
    "owasp", "vulnerability", "siem",
  ],
  frontend: [
    "react", "next.js", "nextjs", "vue", "nuxt", "angular", "svelte",
    "tailwind", "css", "sass", "webpack", "vite", "redux", "zustand",
    "react.js", "jsx", "tsx", "material ui", "mui", "chakra ui", "mern", "mern stack",
  ],
  web: [
    "html", "css", "javascript", "typescript", "web components",
    "graphql", "rest", "responsive design", "browser api", "dom",
  ],
  backend: [
    "node.js", "nodejs", "express", "nestjs", "fastify",
    "python", "django", "flask", "fastapi",
    "go", "golang", "gin", "fiber",
    "java", "spring", "spring boot", "kotlin",
    "ruby", "rails", "rust", "actix", "c#", ".net", "node", "npm", "yarn", "pnpm",
    "mern", "mern stack",
  ],
  databases: [
    "postgres", "postgresql", "mysql", "sqlite", "sql server",
    "mongodb", "mongo", "mongoose", "mern", "mern stack", "dynamodb", "redis", "cassandra", "elasticsearch",
    "clickhouse", "snowflake", "bigquery", "redshift",
  ],
  data: [
    "spark", "airflow", "dbt", "kafka", "flink", "hadoop",
    "snowflake", "databricks", "bigquery", "redshift", "etl",
    "streaming", "beam", "presto", "trino",
  ],
  ml: [
    "pytorch", "tensorflow", "scikit-learn", "sklearn", "keras",
    "hugging face", "transformers", "llm", "openai", "langchain",
    "vector database", "pinecone", "weaviate", "milvus", "mlops",
    "vertex ai", "sagemaker", "rag", "retrieval augmented generation",
    "agentic ai", "ai agents", "autogen", "crewai", "llamaindex", "llama index",
  ],
  python: ["python", "pandas", "numpy", "scipy", "jupyter", "polars"],
  mobile: [
    "swift", "swiftui", "objective-c", "kotlin", "jetpack compose",
    "android sdk", "ios sdk", "react native", "flutter", "xamarin",
  ],
};

/** Reverse index: token -> cluster ids. */
const TOKEN_TO_CLUSTERS: Map<string, Set<string>> = (() => {
  const m = new Map<string, Set<string>>();
  for (const [cluster, tokens] of Object.entries(TECH_GRAPH)) {
    for (const t of tokens) {
      const key = t.toLowerCase();
      const set = m.get(key) ?? new Set<string>();
      set.add(cluster);
      m.set(key, set);
    }
  }
  return m;
})();

const STOPWORDS = new Set([
  "the","a","an","and","or","of","for","in","at","to","with","on","by",
  "senior","junior","staff","lead","principal","mid","entry","intern",
  "engineer","developer","specialist","manager","role","job","jobs","roles",
  "remote","hybrid","onsite","i","ii","iii","iv",
]);

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#./\- ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Per-family disqualifier patterns. When a job title matches its family's
 * disqualifier regex, that family is skipped during detection / scoring.
 * This prevents "AI Platform" from being pulled into `devops` just because
 * it shares the "platform" token, and vice versa.
 */
const ML_SIGNAL =
  /\b(machine\s*learning|\bml\b|\bai\b|ai\s*[/]\s*ml|ml\s*[/]\s*ai|ai\s+platform|ml\s+platform|ai\s+infra|ml\s+infra|data\s+scien|deep\s+learning|\bllm(s)?\b|genai|gen\s+ai|generative|neural|pytorch|tensorflow|hugging\s*face|transformers?|diffusion|model\s+deploy|models\s+deploy|model\s+serving|inference|nlp|computer\s+vision|foundation\s+model|applied\s+scientist|research\s+scientist)\b/i;
const NON_ENG_SIGNAL =
  /\b(sales|account\s+executive|business\s+development|marketing|brand|seo|content|recruit|talent|human\s+resources|hr\s+business|finance|accountant|controller|treasury|customer\s+success|customer\s+support)\b/i;
const ENG_SIGNAL =
  /\b(engineer|developer|swe|sre|devops|platform|infrastructure|backend|frontend|full\s*stack|mobile|ios|android|data\s+engineer|security\s+engineer|qa\s+engineer|architect)\b/i;
const GENERIC_NON_DEVOPS_ENGINEERING_SIGNAL =
  /\b(software\s+engineer|software\s+developer|backend\s+engineer|front[- ]?end\s+engineer|full[- ]?stack\s+engineer|web\s+developer|application\s+engineer|product\s+engineer|mobile\s+engineer|ios\s+engineer|android\s+engineer|data\s+engineer|qa\s+engineer|test\s+engineer|tax\s+experience|tax\s+engineer|gtm\s+systems|sales\s+engineer|solutions\s+engineer)\b/i;

const DISQUALIFIERS: Record<string, RegExp> = {
  devops: new RegExp(`${ML_SIGNAL.source}|${GENERIC_NON_DEVOPS_ENGINEERING_SIGNAL.source}`, "i"),
  backend: ML_SIGNAL,
  frontend: ML_SIGNAL,
  fullstack: ML_SIGNAL,
  mobile: ML_SIGNAL,
  data: ML_SIGNAL, // "data engineer" shouldn't swallow ML roles either
  security: ML_SIGNAL,
  qa: ML_SIGNAL,
  // Business/ops families must not swallow engineering titles.
  sales: ENG_SIGNAL,
  marketing: ENG_SIGNAL,
  people: ENG_SIGNAL,
  finance: ENG_SIGNAL,
  customer: ENG_SIGNAL,
  // ML shouldn't be picked when the title is clearly non-engineering.
  ml: NON_ENG_SIGNAL,
  datascience: NON_ENG_SIGNAL,
};

function familyDisqualified(family: RoleFamily, title: string): boolean {
  const rx = DISQUALIFIERS[family.id];
  return !!(rx && rx.test(title));
}

/**
 * Detect the best-matching role family for a natural-language query.
 * Returns null when nothing recognizable is found.
 */
export function detectRoleFamily(query: string): RoleFamily | null {
  const q = norm(query);
  if (!q) return null;
  let best: { family: RoleFamily; hits: number } | null = null;
  for (const family of ROLE_FAMILIES) {
    if (familyDisqualified(family, q)) continue;
    let hits = 0;
    for (const t of family.tokens) if (q.includes(t)) hits += t.split(" ").length;
    for (const s of family.synonyms) if (q.includes(s)) hits += 3;
    if (hits && (!best || hits > best.hits)) best = { family, hits };
  }
  return best?.family ?? null;
}

/**
 * Return keyword list to OR-ilike against the `title` column.
 */
export function expandQueryKeywords(query: string): { family: RoleFamily | null; keywords: string[] } {
  const q = norm(query);
  const family = detectRoleFamily(q);
  const keywords = new Set<string>();
  if (family) {
    for (const s of family.synonyms) keywords.add(s);
    for (const t of family.tokens) if (t.length >= 3) keywords.add(t);
  }
  for (const tok of q.split(" ")) {
    if (tok.length >= 3 && !STOPWORDS.has(tok)) keywords.add(tok);
  }
  return { family, keywords: Array.from(keywords).slice(0, 32) };
}

/**
 * Title-relevance score in [0..100] against a raw query.
 */
export function titleRelevanceScore(title: string, query: string): number {
  if (!query) return 0;
  const t = norm(title);
  if (!t) return 0;
  const family = detectRoleFamily(query);
  let score = 0;
  if (family) score = Math.max(score, familyTitleRelevance(t, family));
  const qTokens = norm(query).split(" ").filter((tok) => tok.length >= 3 && !STOPWORDS.has(tok));
  for (const tok of qTokens) if (t.includes(tok)) score += 12;
  const rawQ = norm(query);
  if (rawQ && t.includes(rawQ)) score += 50;
  return Math.min(100, score);
}

/**
 * Score a job title's relevance to a specific role family, in [0..100].
 * Any synonym match is a strong signal (60+). Any token match is medium.
 * Returns 0 when the title trips the family's disqualifier (e.g. an
 * "AI Platform" title vs. the `devops` family).
 */
export function familyTitleRelevance(title: string, family: RoleFamily): number {
  const t = norm(title);
  if (!t) return 0;
  if (familyDisqualified(family, t)) return 0;
  let score = 0;
  for (const syn of family.synonyms) if (t.includes(syn)) score = Math.max(score, 90);
  for (const tok of family.tokens) {
    if (t.includes(tok)) score = Math.max(score, 55 + Math.min(30, tok.length));
  }
  return Math.min(100, score);
}

/**
 * Return every tech cluster a raw skill/tech string belongs to.
 */
export function clustersForTech(tech: string): string[] {
  const key = tech.toLowerCase().trim();
  if (!key) return [];
  const direct = TOKEN_TO_CLUSTERS.get(key);
  if (direct) return Array.from(direct);
  // partial contains — e.g. "amazon eks (production)"
  const out = new Set<string>();
  for (const [tok, clusters] of TOKEN_TO_CLUSTERS.entries()) {
    if (key.includes(tok) || tok.includes(key)) for (const c of clusters) out.add(c);
  }
  return Array.from(out);
}

/**
 * Semantic overlap in [0..1] between two tech string collections.
 * Compares CLUSTERS, not raw strings, so "docker" and "kubernetes" both
 * count toward the "containers" cluster.
 */
export function semanticTechOverlap(a: string[], b: string[]): number {
  const aClusters = new Set<string>();
  for (const t of a) for (const c of clustersForTech(t)) aClusters.add(c);
  const bClusters = new Set<string>();
  for (const t of b) for (const c of clustersForTech(t)) bClusters.add(c);
  if (aClusters.size === 0 || bClusters.size === 0) return 0;
  let inter = 0;
  for (const c of aClusters) if (bClusters.has(c)) inter++;
  return inter / Math.max(aClusters.size, bClusters.size);
}

/**
 * Derive the candidate's primary role families from the Career Brain.
 * Ranked by strength (preferredRole > currentTitle > verified skills > tech clusters).
 */
export function familiesFromBrain(input: {
  preferredRole?: string | null;
  currentTitle?: string | null;
  skills?: string[];
  projectTechs?: string[];
}): RoleFamily[] {
  const scores = new Map<string, number>();
  const bump = (id: string, n: number) => scores.set(id, (scores.get(id) ?? 0) + n);

  if (input.preferredRole) {
    const f = detectRoleFamily(input.preferredRole);
    if (f) bump(f.id, 100);
  }
  if (input.currentTitle) {
    const f = detectRoleFamily(input.currentTitle);
    if (f) bump(f.id, 60);
  }

  // Skills + project techs feed into cluster -> family mapping.
  const techs = [...(input.skills ?? []), ...(input.projectTechs ?? [])];
  const clusterHits = new Map<string, number>();
  for (const t of techs) for (const c of clustersForTech(t)) clusterHits.set(c, (clusterHits.get(c) ?? 0) + 1);
  for (const fam of ROLE_FAMILIES) {
    for (const cluster of fam.techClusters ?? []) {
      const h = clusterHits.get(cluster) ?? 0;
      if (h) bump(fam.id, Math.min(25, h * 2));
    }
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => ROLE_FAMILIES.find((f) => f.id === id)!)
    .filter(Boolean)
    .slice(0, 4);
}

const ROLE_QUERY_STRATEGIES: Record<string, string[]> = {
  devops: [
    "DevOps Engineer",
    "Cloud Engineer",
    "Platform Engineer",
    "Site Reliability Engineer",
    "SRE",
    "Infrastructure Engineer",
    "AWS Engineer",
    "Kubernetes Engineer",
    "DevSecOps Engineer",
    "CI/CD Engineer",
    "Terraform Engineer",
    "Linux Engineer",
    "Cloud Infrastructure Engineer",
    "Platform Reliability Engineer",
  ],
  frontend: [
    "Frontend Developer",
    "Frontend Engineer",
    "React Developer",
    "React Engineer",
    "Next.js Developer",
    "JavaScript Developer",
    "TypeScript Developer",
    "UI Developer",
    "UI Engineer",
    "Web Developer",
    "Front End Developer",
    "Front-End Engineer",
  ],
  backend: [
    "Backend Developer",
    "Backend Engineer",
    "Node.js Developer",
    "Node Engineer",
    "API Developer",
    "API Engineer",
    "Server Developer",
    "Python Backend Developer",
    "Java Backend Developer",
    "Golang Developer",
    "Microservices Engineer",
  ],
  fullstack: [
    "MERN Stack Developer",
    "MERN Developer",
    "Full Stack Developer",
    "Full Stack Engineer",
    "Full-Stack Developer",
    "React Node Developer",
    "Node React Developer",
    "MEAN Stack Developer",
    "JavaScript Full Stack Developer",
    "Web Application Developer",
  ],
  ml: [
    "Machine Learning Engineer",
    "AI Engineer",
    "AI ML Engineer",
    "ML Engineer",
    "Generative AI Engineer",
    "Agentic AI Engineer",
    "AI Agent Engineer",
    "LLM Engineer",
    "RAG Engineer",
    "MLOps Engineer",
    "Applied AI Engineer",
    "NLP Engineer",
    "Computer Vision Engineer",
  ],
  datascience: [
    "Data Scientist",
    "Applied Data Scientist",
    "Decision Scientist",
    "Analytics Scientist",
    "Machine Learning Scientist",
  ],
  data: [
    "Data Engineer",
    "Analytics Engineer",
    "ETL Developer",
    "Data Platform Engineer",
    "Big Data Engineer",
    "Spark Developer",
    "Airflow Engineer",
  ],
  mobile: [
    "Mobile Developer",
    "Mobile Engineer",
    "Android Developer",
    "Android Engineer",
    "iOS Developer",
    "iOS Engineer",
    "React Native Developer",
    "Flutter Developer",
  ],
  security: [
    "Security Engineer",
    "Cybersecurity Engineer",
    "Application Security Engineer",
    "Cloud Security Engineer",
    "Product Security Engineer",
    "DevSecOps Engineer",
  ],
  qa: [
    "QA Engineer",
    "Test Engineer",
    "SDET",
    "Automation Tester",
    "Quality Assurance Engineer",
    "Test Automation Engineer",
  ],
};

const STRICT_PRIMARY_FAMILY_IDS = new Set(["devops"]);

function strictFamiliesForPrimary(primary: RoleFamily | null, scoredFamilies: RoleFamily[]): RoleFamily[] {
  if (!primary) return scoredFamilies;
  if (STRICT_PRIMARY_FAMILY_IDS.has(primary.id)) return [primary];
  return scoredFamilies;
}

function buildRoleQueries(families: RoleFamily[], explicitQueries: Array<string | null | undefined> = []): string[] {
  const roleQueries = new Set<string>();
  for (const f of families) {
    const strategy = ROLE_QUERY_STRATEGIES[f.id];
    if (strategy?.length) {
      for (const q of strategy) roleQueries.add(q);
    } else {
      for (const s of f.synonyms.slice(0, 8)) roleQueries.add(s);
    }
  }
  for (const q of explicitQueries) {
    const trimmed = q?.trim();
    if (trimmed) roleQueries.add(trimmed);
  }
  return Array.from(roleQueries).filter((q) => !/^\s*(engineer|software engineer|developer|technical engineer)\s*$/i.test(q)).slice(0, 24);
}

/**
 * Compatibility between two families in [0..1].
 * 1.0 same family, 0.7 related, 0.4 same track, 0.0 different track.
 */
export function familyCompatibility(a: RoleFamily, b: RoleFamily): number {
  if (a.id === b.id) return 1;
  if ((a.related ?? []).includes(b.id) || (b.related ?? []).includes(a.id)) return 0.7;
  if (a.track === b.track) return 0.4;
  return 0;
}

/**
 * Return [0..1] indicating how well a job title fits ANY of the brain's
 * primary families. 0 means the title lives in a completely unrelated track
 * (e.g. Sales for a DevOps candidate).
 */
export function jobFamilyFit(
  jobTitle: string,
  brainFamilies: RoleFamily[],
): { fit: number; via: RoleFamily | null; jobFamily: RoleFamily | null } {
  if (!brainFamilies.length) return { fit: 0.5, via: null, jobFamily: null };
  const jobFamily = detectRoleFamily(jobTitle);
  if (!jobFamily) {
    const rel = familyTitleRelevance(jobTitle, brainFamilies[0]) / 100;
    return { fit: rel * 0.7, via: brainFamilies[0], jobFamily: null };
  }
  let best = { fit: 0, via: brainFamilies[0] };
  for (const bf of brainFamilies) {
    const c = familyCompatibility(bf, jobFamily);
    if (c > best.fit) best = { fit: c, via: bf };
  }
  return { fit: best.fit, via: best.via, jobFamily };
}

// ============================================================================
// CANDIDATE PROFILE — Career Brain is the source of truth for DISCOVERY.
// The profile decides which role families are ALLOWED, which are EXCLUDED,
// and how every job is classified (title + description + skills + tech stack).
// ============================================================================

export type JobLike = {
  title?: string | null;
  description?: string | null;
  requiredSkills?: string[] | null;
  preferredSkills?: string[] | null;
  companyTechStack?: string[] | null;
  responsibilities?: string[] | null;
  requirements?: string[] | null;
};

export type CandidateProfile = {
  primary: RoleFamily | null;
  primaryLabel: string | null;
  primaryDomain: string | null;
  families: RoleFamily[];
  familyIds: Set<string>;
  familyLabels: string[];
  /**
   * Families the candidate should NEVER see. Any family whose track differs
   * from the primary AND that isn't itself present in the brain's families.
   * This is the hard exclusion set — DevOps brain excludes ml, datascience,
   * sales, marketing, finance, etc. Even 0.7-related families are dropped
   * when they live in a different track (e.g. ml is related to backend/data
   * but lives on the "data" track — excluded for an engineering-track
   * DevOps candidate).
   */
  excludedFamilyIds: Set<string>;
  excludedFamilyLabels: string[];
  /** Role search queries to hand to providers that accept a query. */
  roleQueries: string[];
  /** Seniority band derived from years of experience. */
  seniority: "intern" | "entry" | "junior" | "mid" | "senior" | "staff" | null;
  yearsOfExperience: number | null;
  /** Preferred technologies (skills + project techs, deduped, ordered). */
  techStack: string[];
  /** Preferred locations (from preferences.preferredLocation and identity.location). */
  locations: string[];
  /** remote / hybrid / onsite / any */
  remotePreference: "remote" | "hybrid" | "onsite" | "any";
  industries: string[];
};

function deriveSeniority(years: number | null | undefined): CandidateProfile["seniority"] {
  if (years == null) return null;
  if (years < 1) return "entry";
  if (years < 3) return "junior";
  if (years < 6) return "mid";
  if (years < 10) return "senior";
  return "staff";
}

function detectRemotePref(loc: string | null | undefined): CandidateProfile["remotePreference"] {
  const s = (loc ?? "").toLowerCase();
  if (/remote/.test(s)) return "remote";
  if (/hybrid/.test(s)) return "hybrid";
  if (/onsite|on-site|office/.test(s)) return "onsite";
  return "any";
}

export function buildCandidateProfile(input: {
  preferredRole?: string | null;
  currentTitle?: string | null;
  skills?: string[];
  projectTechs?: string[];
  yearsOfExperience?: number | null;
  preferredLocation?: string | null;
  location?: string | null;
  industries?: string[];
}): CandidateProfile {
  const scoredFamilies = familiesFromBrain(input);
  const primary = scoredFamilies[0] ?? null;
  const families = strictFamiliesForPrimary(primary, scoredFamilies);
  const familyIds = new Set(families.map((f) => f.id));

  const excludedFamilyIds = new Set<string>();
  if (primary) {
    for (const fam of ROLE_FAMILIES) {
      if (familyIds.has(fam.id)) continue;
      if (STRICT_PRIMARY_FAMILY_IDS.has(primary.id) || fam.track !== primary.track) excludedFamilyIds.add(fam.id);
    }
  }

  const explicitBrainRoles = [input.preferredRole, input.currentTitle].filter((q) => {
    if (!q || !primary) return false;
    const detected = detectRoleFamily(q);
    return !detected || familyIds.has(detected.id);
  });
  const roleQueries = buildRoleQueries(families, explicitBrainRoles);

  const techStack = Array.from(
    new Set([...(input.skills ?? []), ...(input.projectTechs ?? [])].map((s) => s.trim()).filter(Boolean)),
  ).slice(0, 40);

  const locations = Array.from(
    new Set(
      [input.preferredLocation, input.location]
        .filter((s): s is string => !!s && s.trim().length > 0)
        .map((s) => s.trim()),
    ),
  );

  const excludedFamilyLabels = Array.from(excludedFamilyIds)
    .map((id) => ROLE_FAMILIES.find((f) => f.id === id)?.label ?? id);

  return {
    primary,
    primaryLabel: primary?.label ?? null,
    primaryDomain: primary?.track ?? null,
    families,
    familyIds,
    familyLabels: families.map((f) => f.label),
    excludedFamilyIds,
    excludedFamilyLabels,
    roleQueries,
    seniority: deriveSeniority(input.yearsOfExperience ?? null),
    yearsOfExperience: input.yearsOfExperience ?? null,
    techStack,
    locations,
    remotePreference: detectRemotePref(input.preferredLocation ?? input.location),
    industries: (input.industries ?? []).slice(0, 12),
  };
}

export function profileForExplicitSearch(base: CandidateProfile, query: string): CandidateProfile {
  const detected = detectRoleFamily(query);
  if (!detected) {
    return { ...base, roleQueries: buildRoleQueries(base.families, [query, ...base.roleQueries]) };
  }
  const families = strictFamiliesForPrimary(detected, [detected]);
  const familyIds = new Set(families.map((f) => f.id));
  const excludedFamilyIds = new Set<string>();
  for (const fam of ROLE_FAMILIES) if (!familyIds.has(fam.id)) excludedFamilyIds.add(fam.id);
  return {
    ...base,
    primary: detected,
    primaryLabel: detected.label,
    primaryDomain: detected.track,
    families,
    familyIds,
    familyLabels: families.map((f) => f.label),
    excludedFamilyIds,
    excludedFamilyLabels: Array.from(excludedFamilyIds).map((id) => ROLE_FAMILIES.find((f) => f.id === id)?.label ?? id),
    roleQueries: buildRoleQueries(families, [query]),
  };
}

/**
 * Convenience: build the profile directly from a CareerBrainSnapshot.
 * Central helper so every stage of the pipeline projects the brain into a
 * profile identically.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildProfileFromSnapshot(brain: any): CandidateProfile {
  if (!brain?.ready) {
    return buildCandidateProfile({});
  }
  return buildCandidateProfile({
    preferredRole: brain.identity?.preferences?.preferredRole ?? null,
    currentTitle: brain.identity?.currentTitle ?? null,
    skills: (brain.skills ?? []).map((s: { name: string }) => s.name),
    projectTechs: (brain.projects ?? []).flatMap((p: { technologies?: string[] }) => p?.technologies ?? []),
    yearsOfExperience: brain.identity?.yearsOfExperience ?? null,
    preferredLocation: brain.identity?.preferences?.preferredLocation ?? null,
    location: brain.identity?.location ?? null,
    industries: [],
  });
}

/**
 * Classify a job into a single role family using EVERY available signal —
 * title first, then description / skills / company tech stack. Returns null
 * when nothing recognizable is found.
 *
 * This is what makes "Software Engineer" whose description mentions PyTorch,
 * HuggingFace, and LLMs resolve to `ml` — not `fullstack`.
 */
export function classifyJob(job: JobLike): RoleFamily | null {
  const title = norm(job.title ?? "");
  const bodyRaw = [
    job.description ?? "",
    ...(job.responsibilities ?? []),
    ...(job.requirements ?? []),
  ]
    .join(" ")
    .slice(0, 4000);
  const body = norm(bodyRaw);
  const techs = [
    ...(job.requiredSkills ?? []),
    ...(job.preferredSkills ?? []),
    ...(job.companyTechStack ?? []),
  ].map((s) => s.toLowerCase());

  // Cluster hits from job's declared tech.
  const clusterHits = new Map<string, number>();
  for (const t of techs) {
    for (const c of clustersForTech(t)) clusterHits.set(c, (clusterHits.get(c) ?? 0) + 2);
  }
  // Description-based cluster hits (weak signal but crucial when tech list is empty).
  for (const [tok, clusters] of TOKEN_TO_CLUSTERS.entries()) {
    if (tok.length < 3) continue;
    if (body.includes(tok)) for (const c of clusters) clusterHits.set(c, (clusterHits.get(c) ?? 0) + 1);
  }

  const combined = `${title} ${body}`;

  const scores: Array<{ f: RoleFamily; score: number }> = [];
  for (const fam of ROLE_FAMILIES) {
    if (familyDisqualified(fam, title)) continue;
    let score = 0;
    // Title signal (strongest).
    for (const s of fam.synonyms) if (title.includes(s)) score += 60;
    for (const t of fam.tokens) if (title.includes(t)) score += 20;
    // Body signal.
    for (const s of fam.synonyms) if (body.includes(s)) score += 6;
    for (const t of fam.tokens) if (body.includes(t)) score += 2;
    // Cluster signal.
    for (const cluster of fam.techClusters ?? []) {
      const h = clusterHits.get(cluster) ?? 0;
      if (h) score += Math.min(30, h * 3);
    }
    if (score > 0) scores.push({ f: fam, score });
  }
  if (!scores.length) return null;
  scores.sort((a, b) => b.score - a.score);
  return scores[0].f;
}

export function domainConfidence(
  job: JobLike,
  profile: CandidateProfile,
  queryCandidates: string[] = profile.roleQueries,
): { confidence: number; reason: string; matchedQueries: string[]; jobFamily: RoleFamily | null; excluded: boolean } {
  const title = norm(job.title ?? "");
  const hay = norm([
    job.title ?? "",
    job.description ?? "",
    ...(job.requiredSkills ?? []),
    ...(job.preferredSkills ?? []),
    ...(job.companyTechStack ?? []),
    ...(job.responsibilities ?? []),
    ...(job.requirements ?? []),
  ].join(" ").slice(0, 5000));
  const jobFamily = classifyJob(job);
  const matchedQueries = queryCandidates.filter((q) => {
    const normalized = norm(q);
    return normalized.length >= 3 && (title.includes(normalized) || hay.includes(normalized));
  });
  if (jobFamily && profile.excludedFamilyIds.has(jobFamily.id)) {
    return { confidence: 0, reason: `Excluded family: ${jobFamily.label}`, matchedQueries, jobFamily, excluded: true };
  }
  if (profile.primary?.id === "devops" && GENERIC_NON_DEVOPS_ENGINEERING_SIGNAL.test(title)) {
    return { confidence: 0, reason: "Generic/non-DevOps engineering title", matchedQueries, jobFamily, excluded: true };
  }
  if (jobFamily && profile.familyIds.has(jobFamily.id)) {
    const tech = semanticTechOverlap(profile.techStack, [
      ...(job.requiredSkills ?? []),
      ...(job.preferredSkills ?? []),
      ...(job.companyTechStack ?? []),
    ]);
    return {
      confidence: Math.min(1, 0.82 + tech * 0.18),
      reason: `Allowed family: ${jobFamily.label}`,
      matchedQueries,
      jobFamily,
      excluded: false,
    };
  }
  if (matchedQueries.length > 0) {
    return { confidence: 0.72, reason: `Matched search query: ${matchedQueries[0]}`, matchedQueries, jobFamily, excluded: false };
  }
  return { confidence: 0, reason: jobFamily ? `Off-track family: ${jobFamily.label}` : "No role-family or search-query match", matchedQueries, jobFamily, excluded: false };
}

/**
 * Rich family fit for a job (uses full classification, not just title).
 * `excluded` flag is the hard signal: never score, never show.
 */
export function jobFamilyFitProfile(
  job: JobLike,
  profile: CandidateProfile,
): { fit: number; via: RoleFamily | null; jobFamily: RoleFamily | null; excluded: boolean } {
  const jobFamily = classifyJob(job);
  if (!profile.families.length) {
    return { fit: 0.5, via: null, jobFamily, excluded: false };
  }
  if (jobFamily && profile.excludedFamilyIds.has(jobFamily.id)) {
    return { fit: 0, via: profile.primary, jobFamily, excluded: true };
  }
  if (!jobFamily) {
    const rel = familyTitleRelevance(job.title ?? "", profile.families[0]) / 100;
    return { fit: rel * 0.7, via: profile.families[0], jobFamily: null, excluded: false };
  }
  let best = { fit: 0, via: profile.families[0] };
  for (const bf of profile.families) {
    const c = familyCompatibility(bf, jobFamily);
    if (c > best.fit) best = { fit: c, via: bf };
  }
  return { fit: best.fit, via: best.via, jobFamily, excluded: false };
}

