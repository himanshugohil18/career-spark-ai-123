import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  GraduationCap,
  Mic,
  Radar,
  Crosshair,
  KanbanSquare,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type Feature = {
  id: string;
  badge: "NEW" | "UPDATED" | null;
  icon: LucideIcon;
  name: string;
  short: string;
  description: string;
  points: string[];
  cta: { label: string; to: string } | null;
};

const FEATURES: Feature[] = [
  {
    id: "jobs",
    badge: "UPDATED",
    icon: Radar,
    name: "Intelligent Job Discovery",
    short: "Real roles, ranked for you",
    description:
      "Opportunities pulled from live company job boards and ranked using your resume, experience level, location and work preferences.",
    points: [
      "Resume-aware, experience-aware matching",
      "Location-aware ranking across India and global roles",
      "Remote, hybrid and on-site filtering",
      "Entry, mid and senior level support",
      "Real source links and salary context where published",
    ],
    cta: { label: "Explore Jobs", to: "/jobs" },
  },
  {
    id: "matching",
    badge: "UPDATED",
    icon: Crosshair,
    name: "Smart Job Matching",
    short: "Scored against your profile",
    description:
      "Every role gets an explainable match score built from your skills, projects, seniority and eligibility — not keyword overlap.",
    points: [
      "Resume skills and project relevance analysis",
      "Seniority-aware compatibility scoring",
      "Location eligibility and work-mode fit",
      "Transparent breakdown of every score",
    ],
    cta: { label: "See Your Matches", to: "/jobs" },
  },
  {
    id: "teacher",
    badge: "NEW",
    icon: GraduationCap,
    name: "AI Interview Teacher",
    short: "Guided interview preparation",
    description:
      "A coaching mode that teaches as you answer — role-specific questions, hints when you're stuck, and feedback on every response.",
    points: [
      "Role and topic specific question sets",
      "Adaptive difficulty as you improve",
      "Answer-specific feedback and hints",
      "Progress tracked across sessions",
    ],
    cta: { label: "Start Learning", to: "/interview" },
  },
  {
    id: "mock",
    badge: "NEW",
    icon: Mic,
    name: "AI Mock Interview",
    short: "Full simulated rounds",
    description:
      "Run a realistic interview end to end, then get a scored debrief with strengths, weaknesses and a downloadable report.",
    points: [
      "Custom setup: role, company, round type",
      "Technical, behavioural and mixed rounds",
      "Performance evaluation per answer",
      "Session history and PDF debrief",
    ],
    cta: { label: "Start Mock Interview", to: "/interview/simulator" },
  },
  {
    id: "tracker",
    badge: "NEW",
    icon: KanbanSquare,
    name: "Application Tracking",
    short: "Every application in one board",
    description:
      "Track applications through each stage, from saved to offer, with interview progress kept beside the role it belongs to.",
    points: [
      "Stage-based board for every application",
      "Interview progress and follow-ups",
      "Organised pipeline of opportunities",
    ],
    cta: { label: "Track Applications", to: "/tracker" },
  },
  {
    id: "brain",
    badge: null,
    icon: Brain,
    name: "Career Intelligence",
    short: "One brain behind everything",
    description:
      "Your Career Brain parses your resume once, then powers matching, gaps, roadmap and coaching from the same structured profile.",
    points: [
      "Resume analysis and skills extraction",
      "Readiness score and career insights",
      "Personalised next best actions",
    ],
    cta: { label: "Explore Career Brain", to: "/me" },
  },
  {
    id: "platform",
    badge: "UPDATED",
    icon: Activity,
    name: "Platform Intelligence",
    short: "Healthy sources, clean data",
    description:
      "CareerOS monitors its own job sources, so the roles you see come from feeds that are live, validated and recently crawled.",
    points: [
      "Provider health monitoring",
      "Job quality and freshness validation",
      "Internal analytics and reporting",
    ],
    cta: null,
  },
];

const UPDATES = [
  "Job recommendations now factor in experience level and location eligibility.",
  "New AI Interview Teacher for guided, feedback-driven preparation.",
  "New AI Mock Interview with scored performance analysis and PDF debrief.",
  "Improved filters for location, work mode and experience level.",
  "Enhanced application tracking with stage-based progress.",
];

function Badge({ kind }: { kind: "NEW" | "UPDATED" }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]",
        kind === "NEW"
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {kind}
    </span>
  );
}

export function WhatsNew() {
  const [activeId, setActiveId] = useState<string>(FEATURES[0].id);
  const [focused, setFocused] = useState(false);
  const active = FEATURES.find((f) => f.id === activeId) ?? FEATURES[0];
  const ActiveIcon = active.icon;

  return (
    <section id="whats-new" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-40">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow-tag">What&apos;s new</p>
            <h2 className="display-section mt-5 text-5xl text-foreground md:text-6xl">
              What&apos;s New in <span className="text-primary">CareerOS</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
            Discover the latest intelligence, tools, improvements and features
            designed to help you manage your career journey.
          </p>
        </div>

        <div
          className="mt-14 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
          onMouseLeave={() => setFocused(false)}
        >
          {/* Cards */}
          <div className="flex flex-col gap-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const isActive = f.id === activeId;
              const dim = focused && !isActive;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={isActive}
                  onMouseEnter={() => {
                    setActiveId(f.id);
                    setFocused(true);
                  }}
                  onFocus={() => {
                    setActiveId(f.id);
                    setFocused(true);
                  }}
                  onClick={() => {
                    setActiveId(f.id);
                    setFocused(true);
                  }}
                  className={cn(
                    "group w-full rounded-md border p-4 text-left outline-none transition-all duration-300 motion-reduce:transition-none",
                    "focus-visible:ring-2 focus-visible:ring-primary/60",
                    isActive
                      ? "border-primary/50 bg-card shadow-[0_0_0_1px_hsl(var(--primary)/0.08)] md:scale-[1.015]"
                      : "border-border bg-transparent hover:border-primary/30",
                    dim && "opacity-55 md:opacity-45",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-md border transition-colors duration-300",
                        isActive
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-display text-base font-semibold uppercase tracking-tight text-foreground">
                          {f.name}
                        </h3>
                        {f.badge ? <Badge kind={f.badge} /> : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {f.short}
                      </p>
                    </div>
                    <ArrowRight
                      className={cn(
                        "h-4 w-4 shrink-0 transition-all duration-300 motion-reduce:transition-none",
                        isActive
                          ? "translate-x-0 text-primary opacity-100"
                          : "-translate-x-1 text-muted-foreground opacity-0",
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview */}
          <div className="surface-card relative overflow-hidden rounded-md p-6 md:p-9 lg:sticky lg:top-24 lg:self-start">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary">
                    <ActiveIcon className="h-5 w-5" />
                  </span>
                  {active.badge ? <Badge kind={active.badge} /> : null}
                </div>
                <h3 className="mt-6 font-display text-3xl font-bold uppercase tracking-tight text-foreground md:text-4xl">
                  {active.name}
                </h3>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
                  {active.description}
                </p>
                <ul className="mt-7 space-y-2.5">
                  {active.points.map((p) => (
                    <li key={p} className="flex gap-3 text-sm text-foreground">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
                {active.cta ? (
                  <Link
                    to={active.cta.to}
                    className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                  >
                    {active.cta.label} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Latest updates */}
        <div className="mt-16 border-t border-border pt-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="eyebrow-tag">Latest updates</p>
              <ul className="mt-6 space-y-3">
                {UPDATES.map((u) => (
                  <li key={u} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span className="leading-relaxed">{u}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/changelog"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-border px-6 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              View all updates <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
