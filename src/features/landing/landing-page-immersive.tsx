import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Compass,
  Search,
  BarChart3,
  Crosshair,
  TrendingUp,
  Zap,
  Bookmark,
  FileEdit,
  Send,
  Radar,
  Mic,
  Sprout,
  Bot,
  FileText,
  MailCheck,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/landing/logo";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import heroBg from "@/assets/hero-bg.mp4.asset.json";
import journeyVideo from "@/assets/career-journey.mp4.asset.json";
import journeyPoster from "@/assets/career-journey-poster.jpg";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const EASE = [0.22, 1, 0.36, 1] as const;

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Masked line reveal for giant display type */
function MaskLines({ lines, className }: { lines: React.ReactNode[]; className?: string }) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden">
          <motion.span
            className="block"
            initial={{ y: "110%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow-tag">{children}</p>;
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

function ImmersiveNav() {
  const { toggleTheme } = useTheme();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="CareerOS home">
          <Logo size={28} />
          <span className="font-display text-[15px] font-bold uppercase tracking-[0.18em]">
            CareerOS
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-[13px] font-medium text-muted-foreground md:flex">
          <a href="#system" className="transition-colors hover:text-foreground">System</a>
          <a href="#brain" className="transition-colors hover:text-foreground">Career Brain</a>
          <a href="#opportunities" className="transition-colors hover:text-foreground">Opportunities</a>
          <a href="#agents" className="transition-colors hover:text-foreground">AI Agents</a>
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="hidden text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Switch to Classic
          </button>
          <Link
            to="/auth"
            className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition-transform duration-300 hover:scale-[1.04]"
          >
            Start free <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Section 01 — Full-screen hero                                       */
/* ------------------------------------------------------------------ */

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "32%"]);

  return (
    <section ref={ref} className="relative flex min-h-screen flex-col justify-end overflow-hidden">
      {/* Cinematic video layer */}
      <motion.div className="absolute inset-0" style={{ y: videoY }}>
        <video
          className="h-full w-full scale-105 object-cover opacity-45"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={journeyPoster}
        >
          <source src={heroBg.url} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/55" />
      </motion.div>

      <motion.div style={{ y: textY }} className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-20 pt-40 md:px-8">
        <Reveal>
          <Eyebrow>Career intelligence system</Eyebrow>
        </Reveal>
        <h1 className="display-hero mt-6 text-[13.5vw] text-foreground sm:text-[11vw] lg:text-[8.5rem]">
          <MaskLines
            lines={[
              <>Your career.</>,
              <>
                Finally{" "}
                <span className="text-primary">connected.</span>
              </>,
            ]}
          />
        </h1>
        <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <Reveal delay={0.25} className="max-w-md">
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              Your career is not a static profile — it is a system. CareerOS
              understands it, improves it, and moves you forward.
            </p>
          </Reveal>
          <Reveal delay={0.35} className="flex flex-wrap items-center gap-4">
            <Link
              to="/auth"
              className="group inline-flex h-14 items-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:scale-[1.05]"
            >
              Build your career system
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="#system"
              className="inline-flex h-14 items-center rounded-full border border-border px-8 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              See how it works
            </a>
          </Reveal>
        </div>
      </motion.div>

      {/* scroll hint */}
      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <motion.div
          className="h-8 w-px bg-muted-foreground/50"
          animate={{ scaleY: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 02 — The problem                                            */
/* ------------------------------------------------------------------ */

function Problem() {
  const fragments = ["Resume", "Job boards", "Skills", "Applications", "Interviews", "Goals"];
  return (
    <section className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-40">
        <h2 className="display-section text-[11vw] sm:text-[9vw] lg:text-8xl">
          <MaskLines
            lines={[
              <span key="a" className="text-muted-foreground/40">Stop guessing.</span>,
              <span key="b" className="text-foreground">Start building.</span>,
            ]}
          />
        </h2>
        <div className="mt-16 grid gap-12 md:grid-cols-2 md:gap-20">
          <Reveal>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Today your career is scattered across disconnected tools. Each one
              holds a fragment — none of them understand the whole picture.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {fragments.map((f, i) => (
                <motion.span
                  key={f}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.5, ease: EASE }}
                  className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground line-through decoration-muted-foreground/50"
                >
                  {f}
                </motion.span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="flex h-full flex-col justify-center border-l-2 border-primary pl-8">
              <p className="font-display text-2xl font-bold leading-snug text-foreground md:text-3xl">
                CareerOS connects every fragment into one intelligent system —
                so every action compounds.
              </p>
              <p className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-primary">
                One profile. One brain. One trajectory.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 03 — Career Brain                                           */
/* ------------------------------------------------------------------ */

const BRAIN_NODES = [
  { icon: FileText, label: "Resume", detail: "Parsed & understood" },
  { icon: Sparkles, label: "Skills", detail: "Verified & ranked" },
  { icon: FileEdit, label: "Projects", detail: "Evidence of work" },
  { icon: BarChart3, label: "Experience", detail: "Level & trajectory" },
  { icon: Crosshair, label: "Goals", detail: "Where you're heading" },
];

function CareerBrain() {
  return (
    <section id="brain" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-40">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <div>
            <Reveal><Eyebrow>Career Brain</Eyebrow></Reveal>
            <h2 className="display-section mt-5 text-5xl text-foreground md:text-7xl">
              <MaskLines lines={[<>This is what</>, <>CareerOS <span className="text-primary">knows</span></>, <>about you.</>]} />
            </h2>
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-md text-lg leading-relaxed text-muted-foreground">
                Every resume upload, every skill, every goal flows into a single
                living model of your professional identity — and every part of
                the platform reasons over it.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-10">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-foreground">Career Brain completeness</span>
                  <span className="font-mono text-sm text-primary">82%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    whileInView={{ width: "82%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, ease: EASE }}
                  />
                </div>
              </div>
            </Reveal>
          </div>

          {/* Node flow visual */}
          <div className="relative flex flex-col items-stretch gap-0">
            {BRAIN_NODES.map((node, i) => (
              <div key={node.label} className="relative">
                <motion.div
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: EASE }}
                  className="flex items-center gap-5 border border-border bg-card px-6 py-5"
                  style={{ marginLeft: `${i * 6}%` }}
                >
                  <node.icon className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-bold uppercase tracking-wide text-foreground">{node.label}</p>
                    <p className="text-xs text-muted-foreground">{node.detail}</p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">0{i + 1}</span>
                </motion.div>
                {i < BRAIN_NODES.length && (
                  <motion.div
                    className="h-6 w-px bg-primary/50"
                    style={{ marginLeft: `calc(${i * 6}% + 2.5rem)` }}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.2, duration: 0.4 }}
                  />
                )}
              </div>
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.7, ease: EASE }}
              className="mt-2 flex items-center gap-5 bg-primary px-6 py-6"
            >
              <Brain className="h-7 w-7 text-primary-foreground" />
              <div>
                <p className="font-display text-xl font-bold uppercase tracking-wide text-primary-foreground">Career Brain</p>
                <p className="text-xs font-medium text-primary-foreground/70">One living model — powering every feature</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 04 — Career Intelligence (sticky storytelling)              */
/* ------------------------------------------------------------------ */

const STAGES = [
  { key: "discover", icon: Compass, title: "Discover", body: "CareerOS reads your profile — resume, skills, goals — and builds a live picture of where you stand." },
  { key: "analyze", icon: Search, title: "Analyze", body: "Skills, experience, projects and goals are analyzed against 10,000+ live opportunities." },
  { key: "match", icon: Crosshair, title: "Match", body: "Relevant roles surface with transparent match scores — never a black box." },
  { key: "improve", icon: TrendingUp, title: "Improve", body: "Skill gaps and resume weaknesses become concrete, prioritized recommendations." },
  { key: "act", icon: Zap, title: "Act", body: "Save, prepare, apply, track — the system moves with you from discovery to offer." },
];

function Intelligence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start center", "end center"] });
  const [active, setActive] = useState(0);

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      setActive(Math.min(STAGES.length - 1, Math.max(0, Math.floor(v * STAGES.length))));
    });
    return unsub;
  }, [scrollYProgress]);

  const ActiveIcon = STAGES[active].icon;

  return (
    <section id="system" ref={containerRef} className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-28 md:px-8 md:py-40 lg:grid-cols-2 lg:gap-20">
        {/* Sticky evolving visual */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal><Eyebrow>Career intelligence</Eyebrow></Reveal>
          <h2 className="display-section mt-5 text-5xl text-foreground md:text-6xl">
            One system.<br />Five moves.
          </h2>
          <div className="relative mt-12 flex aspect-[4/3] items-center justify-center overflow-hidden border border-border bg-background">
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex flex-col items-center gap-6"
            >
              <div className="grid h-24 w-24 place-items-center rounded-full border-2 border-primary">
                <ActiveIcon className="h-10 w-10 text-primary" />
              </div>
              <p className="font-display text-4xl font-bold uppercase tracking-tight text-foreground">
                {STAGES[active].title}
              </p>
              <div className="flex gap-2">
                {STAGES.map((s, i) => (
                  <span
                    key={s.key}
                    className={cn("h-1 w-8 rounded-full transition-colors duration-300", i <= active ? "bg-primary" : "bg-muted")}
                  />
                ))}
              </div>
            </motion.div>
            {/* corner ticks */}
            <span className="absolute left-4 top-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Stage 0{active + 1} / 05
            </span>
          </div>
        </div>

        {/* Scrolling stages */}
        <div className="flex flex-col gap-24 py-10 lg:gap-40">
          {STAGES.map((stage, i) => (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0.15 }}
              whileInView={{ opacity: 1 }}
              viewport={{ margin: "-45% 0px -45% 0px" }}
              className="transition-opacity"
            >
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">0{i + 1}</span>
              <h3 className="display-section mt-3 text-4xl text-foreground md:text-5xl">{stage.title}</h3>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">{stage.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 05 — Opportunity discovery                                  */
/* ------------------------------------------------------------------ */

function Opportunities() {
  return (
    <section id="opportunities" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-40">
        <Reveal><Eyebrow>Opportunity discovery</Eyebrow></Reveal>
        <h2 className="display-section mt-5 max-w-4xl text-5xl text-foreground md:text-7xl">
          <MaskLines lines={[<>Opportunities.</>, <span key="b" className="text-primary">Built around you.</span>]} />
        </h2>

        <div className="mt-16 grid gap-6 lg:grid-cols-5">
          {/* Best match — dominant */}
          <Reveal className="lg:col-span-3">
            <div className="group relative h-full border border-primary/60 bg-accent p-8 md:p-10">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Best match · Apply first</span>
                <span className="font-display text-5xl font-bold text-primary">94</span>
              </div>
              <h3 className="mt-6 font-display text-3xl font-bold text-foreground md:text-4xl">Senior Frontend Engineer</h3>
              <p className="mt-1 text-sm text-muted-foreground">Meridian Systems · Bengaluru · Hybrid</p>
              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-muted-foreground">Salary</p><p className="mt-0.5 font-semibold text-foreground">₹28–38 LPA</p></div>
                <div><p className="text-muted-foreground">Freshness</p><p className="mt-0.5 font-semibold text-success">Posted 2h ago</p></div>
                <div><p className="text-muted-foreground">AI confidence</p><p className="mt-0.5 font-semibold text-foreground">Very high</p></div>
              </div>
              <div className="mt-6 border-t border-border pt-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Why it matches:</span> your React + TypeScript depth and design-system work align directly. One gap: <span className="text-warning">GraphQL</span> — a 3-day learning path is ready.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Supporting matches */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {[
              { title: "Product Engineer", company: "Northwind Labs", score: 88, note: "Strong skill overlap" },
              { title: "UI Engineer", company: "Craftbase", score: 84, note: "Portfolio-driven fit" },
            ].map((job, i) => (
              <Reveal key={job.title} delay={0.12 * (i + 1)} className="flex-1">
                <div className="flex h-full flex-col justify-between border border-border bg-card p-7 transition-colors duration-300 hover:border-primary/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Strong match</p>
                      <h4 className="mt-2 font-display text-xl font-bold text-foreground">{job.title}</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">{job.company} · {job.note}</p>
                    </div>
                    <span className="font-display text-3xl font-bold text-foreground/80">{job.score}</span>
                  </div>
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.4}>
              <div className="flex items-center justify-between border border-border px-7 py-5 text-sm text-muted-foreground">
                <span>+ 47 more in Explore</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 06 — Action journey                                         */
/* ------------------------------------------------------------------ */

const JOURNEY = [
  { icon: Bookmark, label: "Save" },
  { icon: FileEdit, label: "Prepare" },
  { icon: Send, label: "Apply" },
  { icon: Radar, label: "Track" },
  { icon: Mic, label: "Interview" },
  { icon: Sprout, label: "Grow" },
];

function Journey() {
  return (
    <section className="relative overflow-hidden border-t border-border bg-card">
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15"
        autoPlay muted loop playsInline preload="none" poster={journeyPoster}
      >
        <source src={journeyVideo.url} type="video/mp4" />
      </video>
      <div className="relative mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
        <Reveal><Eyebrow>Take action</Eyebrow></Reveal>
        <h2 className="display-section mt-5 text-5xl text-foreground md:text-7xl">One connected journey.</h2>
        <div className="mt-16 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {JOURNEY.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
              className="group flex flex-col items-center gap-4 bg-background px-4 py-10 transition-colors duration-300 hover:bg-accent"
            >
              <step.icon className="h-6 w-6 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
              <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-foreground">{step.label}</p>
              <span className="font-mono text-[10px] text-muted-foreground">0{i + 1}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 07 — AI workforce                                           */
/* ------------------------------------------------------------------ */

const AGENTS = [
  { icon: Bot, name: "Career Agent", state: "Activated", desc: "Understands your goals and coordinates every other agent." },
  { icon: FileText, name: "Resume Agent", state: "Analyzing", desc: "Scores your resume per role and drafts targeted improvements." },
  { icon: MailCheck, name: "Application Agent", state: "Preparing", desc: "Researches companies, tailors materials, awaits your approval." },
  { icon: GraduationCap, name: "Interview Agent", state: "Ready", desc: "Generates role-specific questions and runs mock interviews." },
];

function Workforce() {
  return (
    <section id="agents" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-40">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Reveal><Eyebrow>AI workforce</Eyebrow></Reveal>
            <h2 className="display-section mt-5 text-5xl text-foreground md:text-7xl">
              <MaskLines lines={[<>Agents that</>, <span key="b">work <span className="text-primary">for you.</span></span>]} />
            </h2>
          </div>
          <Reveal delay={0.2}>
            <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
              Not a chatbot. A coordinated team of agents operating on your
              Career Brain — with you in control.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 space-y-px border border-border bg-border">
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, x: -28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: EASE }}
              className="group grid items-center gap-4 bg-background px-6 py-7 transition-colors duration-300 hover:bg-card md:grid-cols-[auto_1fr_auto_auto] md:gap-8 md:px-10"
            >
              <agent.icon className="h-7 w-7 text-primary" />
              <div>
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-foreground md:text-2xl">{agent.name}</h3>
                <p className="mt-1 max-w-lg text-sm text-muted-foreground">{agent.desc}</p>
              </div>
              <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="status-dot inline-block h-1.5 w-1.5 rounded-full bg-success" />
                {agent.state}
              </span>
              <span className="hidden font-mono text-[10px] text-muted-foreground md:block">AGT-0{i + 1}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 08 — Progress                                               */
/* ------------------------------------------------------------------ */

const METRICS = [
  { label: "Career Health", value: 82 },
  { label: "Skill Growth", value: 64 },
  { label: "Match Quality", value: 91 },
  { label: "Career Readiness", value: 73 },
];

function Progress() {
  return (
    <section className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-40">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <Reveal><Eyebrow>Career progress</Eyebrow></Reveal>
            <h2 className="display-section mt-5 text-5xl text-foreground md:text-6xl">
              Actions become measurable momentum.
            </h2>
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-md text-lg leading-relaxed text-muted-foreground">
                Every application, every skill, every interview feeds one
                progress system — so you always know if you're moving forward.
              </p>
            </Reveal>
          </div>
          <div className="space-y-8">
            {METRICS.map((m, i) => (
              <div key={m.label}>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-sm font-bold uppercase tracking-[0.14em] text-foreground">{m.label}</span>
                  <motion.span
                    className="font-display text-3xl font-bold text-primary"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    {m.value}
                  </motion.span>
                </div>
                <div className="mt-3 h-2 overflow-hidden bg-muted">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${m.value}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: i * 0.1, ease: EASE }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 09 — Final CTA                                              */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section ref={ref} className="border-t border-border">
      <div className="mx-auto flex min-h-[80vh] max-w-7xl flex-col items-start justify-center px-5 py-28 md:px-8">
        <Eyebrow>The next move</Eyebrow>
        <h2 className="display-hero mt-6 text-[12vw] text-foreground sm:text-[9vw] lg:text-8xl">
          <MaskLines
            lines={[
              <>Your next move</>,
              <>should not be</>,
              <span key="c" className="text-primary">a guess.</span>,
            ]}
          />
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.5, duration: 0.7, ease: EASE }}
          className="mt-12"
        >
          <Link
            to="/auth"
            className="group inline-flex h-16 items-center gap-3 rounded-full bg-primary px-10 text-base font-semibold text-primary-foreground transition-transform duration-300 hover:scale-[1.05]"
          >
            Build your career system
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function ImmersiveFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-2.5">
          <Logo size={24} />
          <span className="font-display text-sm font-bold uppercase tracking-[0.18em] text-foreground">CareerOS</span>
          <span className="ml-2 rounded-full border border-primary/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary">Immersive</span>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-muted-foreground">
          <Link to="/contact" className="transition-colors hover:text-foreground">Contact</Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <Link to="/auth" className="transition-colors hover:text-foreground">Sign in</Link>
        </nav>
        <p className="text-xs text-muted-foreground">© 2026 CareerOS. Your career, connected.</p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function LandingPageImmersive() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ImmersiveNav />
      <main>
        <Hero />
        <Problem />
        <CareerBrain />
        <Intelligence />
        <Opportunities />
        <Journey />
        <Workforce />
        <Progress />
        <FinalCTA />
      </main>
      <ImmersiveFooter />
    </div>
  );
}
