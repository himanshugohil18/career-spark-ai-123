import { motion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, type ReactNode } from "react";
import {
  ArrowRight,
  Brain,
  Radar,
  FileText,
  MessagesSquare,
  GraduationCap,
  Workflow,
  Check,
  Sparkles,
  ShieldCheck,
  Clock,
  Target,
  Wand2,
  Linkedin,
  Github,
  Twitter,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PillNavbar } from "@/components/landing/pill-navbar";
import { Logo } from "@/components/landing/logo";
import { ComplianceSections } from "@/components/landing/compliance-sections";
import { CinematicVideo } from "@/components/landing/cinematic-video";

import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import heroBg from "@/assets/hero-bg.mp4.asset.json";
import showCandidate from "@/assets/show-candidate.jpg";
import showInterview from "@/assets/show-interview.jpg";
import showResume from "@/assets/show-resume.jpg";


const ease = [0.22, 1, 0.36, 1] as const;

/** After a Google OAuth round-trip the provider returns to "/" — forward
 *  the now-signed-in user to their dashboard. */
function useOAuthLandingRedirect() {
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuthenticated) return;
    let pending = false;
    try {
      pending = sessionStorage.getItem("careeros:oauth-redirect") === "1";
      if (pending) sessionStorage.removeItem("careeros:oauth-redirect");
    } catch {
      /* ignore */
    }
    if (!pending) return;
    toast.success("Signed in successfully", { description: "Taking you to your dashboard…" });
    navigate({ to: "/dashboard" });
  }, [isAuthenticated, navigate]);
}

export function LandingPage() {
  useOAuthLandingRedirect();
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <PillNavbar />
      <main className="relative">
        <Hero />
        <CinematicVideo />
        <SourceLogos />
        <Showcase />


        <Results />
        <Testimonials />
        <Features />
        <HowItWorks />
        <AiHuman />
        <Pricing />
        <FAQ />
        <ComplianceSections />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[13px] font-medium text-primary shadow-[var(--shadow-soft)]">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </span>
  );
}

function Band({
  id,
  tint,
  className,
  children,
}: {
  id?: string;
  tint?: "blue" | "mint" | "none";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative w-full px-5 py-24 md:px-8 md:py-28",
        tint === "blue" && "bg-secondary",
        tint === "mint" && "bg-[var(--tint-mint)]",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[1160px]">{children}</div>
    </section>
  );
}

function Heading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "mb-14 flex flex-col gap-4",
        align === "center" ? "mx-auto max-w-2xl items-center text-center" : "max-w-2xl",
      )}
    >
      {eyebrow ? <Pill>{eyebrow}</Pill> : null}
      <h2 className="font-display text-[32px] leading-[1.12] text-foreground md:text-[44px]">
        {title}
      </h2>
      {description ? (
        <p className="text-[15px] leading-relaxed text-muted-foreground md:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function PrimaryCta({ className }: { className?: string }) {
  const { isAuthenticated, loading } = useSession();
  if (loading) return null;
  return isAuthenticated ? (
    <Link
      to="/dashboard"
      className={cn(
        "group inline-flex h-14 items-center gap-2.5 rounded-full bg-primary px-8 text-[15px] font-medium text-primary-foreground shadow-[0_14px_30px_-14px_rgba(47,92,255,0.9)] transition-all hover:bg-primary-hover hover:shadow-[0_18px_36px_-14px_rgba(47,92,255,0.95)]",
        className,
      )}
    >
      Go to dashboard
      <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
    </Link>
  ) : (
    <Link
      to="/auth"
      search={{ mode: "signup" }}
      className={cn(
        "group inline-flex h-14 items-center gap-2.5 rounded-full bg-primary px-8 text-[15px] font-medium text-primary-foreground shadow-[0_14px_30px_-14px_rgba(47,92,255,0.9)] transition-all hover:bg-primary-hover hover:shadow-[0_18px_36px_-14px_rgba(47,92,255,0.95)]",
        className,
      )}
    >
      Start free
      <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

// -----------------------------------------------------------------------------
// Hero
// -----------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-32 md:px-8 md:pt-40">
      {/* live ambient background video */}
      <video
        aria-hidden
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={showResume}
        className="pointer-events-none absolute inset-0 -z-30 h-full w-full object-cover opacity-45 motion-reduce:hidden"
      >
        <source src={heroBg.url} type="video/mp4" />
      </video>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-background/80"
      />
      <div aria-hidden className="landing-grid-lines pointer-events-none absolute inset-0 -z-10" />


      <div className="mx-auto flex w-full max-w-[1160px] flex-col items-center text-center">
        <Reveal>
          <Pill>Begin here</Pill>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="mt-7 font-display text-[42px] leading-[1.05] text-foreground sm:text-[58px] md:text-[72px]">
            Job Hunting For
            <br />
            <span className="text-gradient-brand">Rapid-Growth Careers</span>
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-[17px]">
            AI agents and a real career engine combined to find your best-fit roles,
            sharpen your resume and run your applications end to end.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <PrimaryCta />
            <a
              href="#how"
              className="inline-flex h-14 items-center rounded-full border border-border bg-card px-7 text-[15px] font-medium text-foreground shadow-[var(--shadow-soft)] transition-colors hover:bg-secondary"
            >
              See how it works
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {["bg-primary", "bg-primary/60", "bg-primary/35"].map((c) => (
                <span
                  key={c}
                  className={cn("h-7 w-7 rounded-full border-2 border-card", c)}
                />
              ))}
            </div>
            <p className="text-[13.5px] text-muted-foreground">
              <span className="font-semibold text-foreground">Join 2,000+</span> candidates hiring smarter
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.3} className="w-full">
          <PipelineMock />
        </Reveal>
      </div>
    </section>
  );
}

const PIPELINE = [
  {
    stage: "Matched",
    count: 24,
    cards: [
      { name: "Senior React Engineer", org: "Razorpay · Bengaluru", tags: ["React", "TypeScript"], tone: "match" },
      { name: "Frontend Engineer II", org: "Zeta · Remote, India", tags: ["Next.js", "Node"], tone: "match" },
    ],
  },
  {
    stage: "Applied",
    count: 7,
    cards: [
      { name: "Full-Stack Developer", org: "Postman · Bengaluru", tags: ["MERN"], tone: "applied" },
    ],
  },
  {
    stage: "Interview",
    count: 3,
    cards: [
      { name: "Product Engineer", org: "Zerodha · Bengaluru", tags: ["Today, 2 PM"], tone: "live" },
    ],
  },
  {
    stage: "Offer",
    count: 1,
    cards: [
      { name: "SDE II — Frontend", org: "Groww · Bengaluru", tags: ["Offer received"], tone: "offer" },
    ],
  },
] as const;

function PipelineMock() {
  return (
    <div className="mt-16 rounded-[26px] border border-border bg-card/70 p-2.5 shadow-[var(--shadow-elevated)] backdrop-blur md:p-3">
      <div className="rounded-[20px] border border-border bg-card p-5 text-left md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Workflow className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-[17px] font-semibold text-foreground">Application Pipeline</p>
              <p className="text-[12.5px] text-muted-foreground">4 active tracks · 35 live roles</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-[12.5px] font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI agent running
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {PIPELINE.map((col, ci) => (
            <div key={col.stage} className="rounded-2xl border border-border bg-surface-2/60 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {col.stage}
                </p>
                <span className="rounded-md bg-card px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-[var(--shadow-soft)]">
                  {col.count}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {col.cards.map((c, i) => (
                  <motion.div
                    key={c.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 * ci + 0.08 * i, ease }}
                    className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]"
                  >
                    <p className="text-[13.5px] font-semibold leading-snug text-foreground">{c.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{c.org}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[11px] font-medium",
                            c.tone === "offer"
                              ? "bg-[#E7F8EF] text-[#15803D]"
                              : c.tone === "live"
                                ? "bg-[#E8EEFF] text-primary"
                                : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
                {col.stage === "Matched" ? (
                  <p className="px-1 py-2 text-center text-[12px] text-muted-foreground">
                    +22 more matches
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Logos
// -----------------------------------------------------------------------------

const SOURCES = ["LinkedIn", "Greenhouse", "Lever", "Ashby", "Workable", "RemoteOK", "Wellfound"];

function SourceLogos() {
  return (
    <Band className="!py-14">
      <p className="mb-8 text-center text-[12.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Live roles pulled from 30+ trusted sources
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
        {SOURCES.map((s, i) => (
          <Reveal key={s} delay={i * 0.04}>
            <span className="rounded-2xl border border-border bg-card px-6 py-3.5 font-display text-[15px] font-semibold text-muted-foreground shadow-[var(--shadow-soft)]">
              {s}
            </span>
          </Reveal>
        ))}
      </div>
    </Band>
  );
}

// -----------------------------------------------------------------------------
// Showcase (imagery)
// -----------------------------------------------------------------------------

const SHOWCASE = [
  {
    src: showResume,
    alt: "Resume on a desk being analysed by CareerOS AI",
    title: "Upload once",
    copy: "Your resume becomes a structured career brain in seconds.",
  },
  {
    src: showCandidate,
    alt: "Candidate reviewing AI-matched jobs on a laptop",
    title: "Matched, not spammed",
    copy: "Title-verified roles across India and remote, ranked by real fit.",
  },
  {
    src: showInterview,
    alt: "Online interview happening on a laptop",
    title: "Land the interview",
    copy: "AI prep, tailored answers and application tracking end to end.",
  },
];

function Showcase() {
  return (
    <Band>
      <Heading
        eyebrow="Inside CareerOS"
        title={<>From resume to interview, in one flow</>}
        description="A real career engine — not a job board. Here is what your week looks like with CareerOS."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {SHOWCASE.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <figure className="group overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={s.src}
                  alt={s.alt}
                  loading="lazy"
                  width={1200}
                  height={900}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </div>
              <figcaption className="p-5">
                <p className="font-display text-[17px] font-semibold text-foreground">{s.title}</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{s.copy}</p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Band>
  );
}


// -----------------------------------------------------------------------------
// Results
// -----------------------------------------------------------------------------

const STATS = [
  { icon: Target, value: "100%", label: "Match precision", note: "Verified across 7 career tracks" },
  { icon: Radar, value: "4,000+", label: "Live roles indexed", note: "Refreshed continuously, never fake" },
  { icon: Clock, value: "3X", label: "Faster applications", note: "AI drafts, you approve" },
  { icon: ShieldCheck, value: "Zero", label: "Spam applications", note: "Every role is title-verified" },
];

function Results() {
  return (
    <Band id="results" tint="mint">
      <Heading
        eyebrow="The results"
        title={
          <>
            What working with CareerOS
            <br className="hidden md:block" /> looks like in practice
          </>
        }
      />
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.07}>
            <div>
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-[var(--shadow-soft)]">
                <s.icon className="h-5 w-5" />
              </span>
              <p className="font-display text-[40px] leading-none text-primary">{s.value}</p>
              <p className="mt-3 text-[15px] font-semibold text-foreground">{s.label}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{s.note}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Band>
  );
}

// -----------------------------------------------------------------------------
// Testimonials
// -----------------------------------------------------------------------------

const QUOTES = [
  {
    quote:
      "I uploaded my resume and within minutes CareerOS showed me roles that actually matched my stack — not the random noise every other job board throws at me.",
    name: "Rahul Mehta",
    role: "Full-Stack Engineer, Bengaluru",
  },
  {
    quote:
      "The resume rewrite alone was worth it. My interview callbacks went from occasional to weekly, and the tracker keeps every application in one place.",
    name: "Ananya Sharma",
    role: "Data Analyst, Pune",
  },
  {
    quote:
      "The AI agent applies while I sleep and the interview prep is scarily close to the real thing. It feels like having a career team behind me.",
    name: "Kunal Patel",
    role: "DevOps Engineer, Ahmedabad",
  },
];

function Testimonials() {
  return (
    <Band>
      <Heading
        eyebrow="What candidates say"
        title="Hear from the people running their search on CareerOS"
      />
      <div className="grid gap-5 md:grid-cols-3">
        {QUOTES.map((q, i) => (
          <Reveal key={q.name} delay={i * 0.08}>
            <figure className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-card)]">
              <blockquote className="text-[15px] leading-relaxed text-foreground/85">
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-7 border-t border-border pt-5">
                <p className="text-[14.5px] font-semibold text-foreground">{q.name}</p>
                <p className="text-[13px] text-muted-foreground">{q.role}</p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Band>
  );
}

// -----------------------------------------------------------------------------
// Features
// -----------------------------------------------------------------------------

const FEATURES = [
  {
    icon: Brain,
    title: "Deep profile understanding",
    body: "Your resume becomes a structured Career Brain — skills, seniority, domains and location intent — before a single job is matched.",
  },
  {
    icon: Radar,
    title: "Real jobs, verified daily",
    body: "30+ ATS boards and portals are crawled continuously. Every listing is a live role with a real apply link, never a scraped placeholder.",
  },
  {
    icon: Target,
    title: "Precision over volume",
    body: "Title-anchored gating keeps a marketing role out of an engineering feed. You see roles you can actually win.",
  },
  {
    icon: FileText,
    title: "Resume that adapts",
    body: "AI rewrites bullets per job description, scores ATS readiness and highlights the gaps worth closing first.",
  },
  {
    icon: MessagesSquare,
    title: "Interview prep on demand",
    body: "Role-specific question banks, mock rounds and feedback tuned to the exact company and stack you're interviewing for.",
  },
  {
    icon: GraduationCap,
    title: "A plan, not a job board",
    body: "Skill gaps become a learning path with milestones, so every week moves you closer to the role you want.",
  },
];

function Features() {
  return (
    <Band id="features" tint="blue">
      <Heading
        eyebrow="Your biggest hiring challenges, solved"
        title="What job hunting should feel like"
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.06}>
            <div className="group h-full rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]">
              <span className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-[19px] text-foreground">{f.title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Band>
  );
}

// -----------------------------------------------------------------------------
// How it works
// -----------------------------------------------------------------------------

const STEPS = [
  { n: "1", title: "Upload your resume", body: "PDF or DOCX. We parse experience, skills, links and location in seconds." },
  { n: "2", title: "Career Brain is built", body: "Your profile is turned into a structured model that drives every match." },
  { n: "3", title: "Meet roles worth your time", body: "India-first, proximity-aware matches with a transparent score and gaps." },
  { n: "4", title: "Apply, prep, land it", body: "Tailored resumes, AI auto-apply, interview prep and a live tracker." },
];

function HowItWorks() {
  return (
    <Band id="how">
      <Heading
        eyebrow="How CareerOS works"
        title={
          <>
            How we bring
            <br className="hidden md:block" /> your next role together
          </>
        }
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.08}>
            <div className="relative h-full rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-[15px] font-semibold text-primary-foreground">
                {s.n}
              </span>
              <h3 className="mt-6 font-display text-[18px] text-foreground">{s.title}</h3>
              <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Band>
  );
}

// -----------------------------------------------------------------------------
// AI + human
// -----------------------------------------------------------------------------

const SPLIT = [
  { kind: "AI", icon: Wand2, title: "AI-powered resume intelligence", body: "Gemini extracts a strict schema from your resume, repairs missing links and benchmarks it against live market demand." },
  { kind: "You", icon: Target, title: "You set the target", body: "Roles, locations, work mode and salary floor — your intent always outranks the model's guess." },
  { kind: "AI", icon: Radar, title: "AI sourcing around the clock", body: "Agents scan thousands of live postings daily and shortlist only what clears the relevance gate." },
  { kind: "You", icon: Check, title: "You approve every application", body: "Nothing is submitted without your review. Auto-apply runs on rails you control." },
  { kind: "AI", icon: MessagesSquare, title: "AI interview simulation", body: "Company- and stack-specific mock rounds with structured feedback after every answer." },
  { kind: "You", icon: Brain, title: "You own your data", body: "Row-level security, one workspace per account, export or delete whenever you want." },
];

function AiHuman() {
  return (
    <Band tint="blue">
      <Heading
        eyebrow="AI that amplifies, you decide"
        title="AI precision meets human judgment"
        description="CareerOS does what machines do best, and leaves the calls that matter to you. You get both."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {SPLIT.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.05}>
            <div className="flex h-full gap-4 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  s.kind === "AI" ? "bg-primary text-primary-foreground" : "bg-secondary text-primary",
                )}
              >
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {s.kind === "AI" ? "AI-powered" : "You-led"}
                </p>
                <h3 className="mt-1.5 font-display text-[18px] text-foreground">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Band>
  );
}

// -----------------------------------------------------------------------------
// Pricing
// -----------------------------------------------------------------------------

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    note: "Everything you need to begin",
    features: ["Resume parsing & ATS score", "Daily job matches", "Application tracker", "Basic interview prep"],
    highlight: false,
  },
  {
    name: "Pro",
    price: "₹499",
    note: "per month · most popular",
    features: ["Unlimited AI resume tailoring", "AI auto-apply agent", "Full interview simulator", "Learning path & skill gaps", "Priority job refresh"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "For campuses & teams",
    features: ["Bulk seats & admin console", "Placement analytics", "Custom job sources", "Dedicated support"],
    highlight: false,
  },
];

function Pricing() {
  return (
    <Band id="pricing">
      <Heading
        eyebrow="Pricing"
        title="Pay for outcomes, not promises"
        description="Start free. Upgrade only when the agent is doing the heavy lifting for you."
      />
      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.08}>
            <div
              className={cn(
                "flex h-full flex-col rounded-3xl border p-8",
                p.highlight
                  ? "border-primary/40 bg-card shadow-[var(--shadow-elevated)] ring-1 ring-primary/20"
                  : "border-border bg-card shadow-[var(--shadow-soft)]",
              )}
            >
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {p.name}
              </p>
              <p className="mt-4 font-display text-[38px] leading-none text-foreground">{p.price}</p>
              <p className="mt-2 text-[13.5px] text-muted-foreground">{p.note}</p>
              <ul className="mt-7 flex flex-1 flex-col gap-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px] text-foreground/85">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className={cn(
                  "mt-8 inline-flex h-12 items-center justify-center rounded-full px-6 text-[14.5px] font-medium transition-colors",
                  p.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "border border-border text-foreground hover:bg-secondary",
                )}
              >
                Get started
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </Band>
  );
}

// -----------------------------------------------------------------------------
// FAQ
// -----------------------------------------------------------------------------

const FAQS = [
  {
    q: "How is CareerOS different from a normal job board?",
    a: "Job boards show you everything and let you filter. CareerOS builds a structured model of your profile first, then only surfaces roles that clear a title, skill and location relevance gate — with a transparent score explaining why.",
  },
  {
    q: "Are the jobs real and live?",
    a: "Yes. Listings are pulled directly from company ATS boards (Greenhouse, Lever, Ashby, Workable and more) and major portals, refreshed continuously. Every card links to the official application page.",
  },
  {
    q: "Does it work for non-engineering roles?",
    a: "It does. Analytics, business analysis, accounting, HR, sales, marketing and project management all have their own role families and veto rules, so tracks never leak into each other.",
  },
  {
    q: "What does the AI auto-apply agent actually do?",
    a: "It selects the best resume version, drafts answers to screening questions and prepares the submission. You review and approve before anything is sent.",
  },
  {
    q: "Is my resume data safe?",
    a: "Your data lives in an isolated workspace protected by row-level security. Only you can read your documents, and you can export or delete them at any time.",
  },
  {
    q: "How much does it cost?",
    a: "The Starter plan is free forever. Pro unlocks unlimited AI tailoring, auto-apply and the full interview simulator for a flat monthly fee.",
  },
];

function FAQ() {
  return (
    <Band id="faq" tint="blue">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <Heading align="left" eyebrow="FAQ" title="Frequently asked questions" />
        <Reveal>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="py-5 text-left font-display text-[16px] text-foreground hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[14.5px] leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </Band>
  );
}

// -----------------------------------------------------------------------------
// CTA + footer
// -----------------------------------------------------------------------------

function CTA() {
  return (
    <Band>
      <Reveal>
        <div
          className="relative overflow-hidden rounded-[32px] border border-border bg-accent px-7 py-16 text-center md:px-16 md:py-20"
        >
          <div aria-hidden className="landing-grid-lines pointer-events-none absolute inset-0" />
          <div className="relative">
            <Pill>Start today</Pill>
            <h2 className="mx-auto mt-6 max-w-2xl font-display text-[32px] leading-[1.12] text-foreground md:text-[46px]">
              Your next role is already posted. <span className="text-gradient-brand">Let's go find it.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Upload your resume and get your first matched shortlist in under two minutes.
            </p>
            <div className="mt-9 flex justify-center">
              <PrimaryCta />
            </div>
          </div>
        </div>
      </Reveal>
    </Band>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card px-5 py-14 md:px-8">
      <div className="mx-auto grid w-full max-w-[1160px] gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-display text-[15px] font-semibold text-foreground">CareerOS</span>
          </div>
          <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">
            The AI career operating system — resume intelligence, real job discovery,
            applications and interview prep in one workspace.
          </p>
          <div className="mt-5 flex items-center gap-3 text-muted-foreground">
            <Linkedin className="h-4.5 w-4.5" />
            <Github className="h-4.5 w-4.5" />
            <Twitter className="h-4.5 w-4.5" />
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground">Product</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-[13.5px] text-muted-foreground">
            <li><a href="#features" className="hover:text-foreground">Features</a></li>
            <li><a href="#how" className="hover:text-foreground">How it works</a></li>
            <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
            <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
          </ul>
        </div>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground">Company</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-[13.5px] text-muted-foreground">
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 flex w-full max-w-[1160px] flex-col gap-2 border-t border-border pt-6 text-[12.5px] text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} CareerOS. All rights reserved.</p>
        <p>Made in India · Built for rapid-growth careers</p>
      </div>
    </footer>
  );
}
