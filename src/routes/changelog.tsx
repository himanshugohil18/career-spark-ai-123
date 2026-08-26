import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Product Updates & Changelog · CareerOS" },
      {
        name: "description",
        content:
          "Recent CareerOS product updates: smarter job discovery, AI Interview Teacher, AI Mock Interview, application tracking and location-aware matching.",
      },
      { property: "og:title", content: "Product Updates & Changelog · CareerOS" },
      {
        property: "og:description",
        content:
          "See what's new in CareerOS — job matching, interview coaching, mock interviews and application tracking improvements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChangelogPage,
});

type Entry = { title: string; tag: "NEW" | "UPDATED"; items: string[] };

const ENTRIES: Entry[] = [
  {
    title: "AI Interview Teacher",
    tag: "NEW",
    items: [
      "Guided coaching mode with role and topic specific questions.",
      "Hints and explanations while you answer.",
      "Answer-specific feedback with adaptive difficulty.",
    ],
  },
  {
    title: "AI Mock Interview",
    tag: "NEW",
    items: [
      "Full simulated rounds with custom role, company and round type.",
      "Technical, behavioural and mixed interview formats.",
      "Scored debrief with strengths, weaknesses and PDF report.",
      "Session history for every past interview.",
    ],
  },
  {
    title: "Intelligent Job Discovery",
    tag: "UPDATED",
    items: [
      "Roles crawled from live company job boards with real application links.",
      "Location-aware ranking across India and global opportunities.",
      "Remote, hybrid and on-site filtering with work-mode preferences.",
      "Entry, mid and senior level support with seniority-aware ranking.",
    ],
  },
  {
    title: "Smart Job Matching",
    tag: "UPDATED",
    items: [
      "Match scores built from resume skills, projects and experience.",
      "Location eligibility factored into every score.",
      "Explainable score breakdown on each role.",
    ],
  },
  {
    title: "Application Tracking",
    tag: "NEW",
    items: [
      "Stage-based board from saved through to offer.",
      "Interview progress kept beside the role it belongs to.",
    ],
  },
  {
    title: "Platform Intelligence",
    tag: "UPDATED",
    items: [
      "Job provider health monitoring with automatic source recovery.",
      "Job quality and freshness validation before roles reach your feed.",
      "Internal analytics and reporting dashboards.",
    ],
  },
];

function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-24 md:px-8 md:py-32">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>
        <p className="eyebrow-tag mt-10">Product updates</p>
        <h1 className="display-section mt-5 text-4xl md:text-6xl">
          What&apos;s new in <span className="text-primary">CareerOS</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
          Every capability listed here is live in the product today. Older
          entries stay listed as they ship.
        </p>

        <div className="mt-14 space-y-4">
          {ENTRIES.map((e) => (
            <article key={e.title} className="surface-card rounded-md p-6">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-xl font-bold uppercase tracking-tight">
                  {e.title}
                </h2>
                <span
                  className={
                    e.tag === "NEW"
                      ? "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary"
                      : "rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground"
                  }
                >
                  {e.tag}
                </span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {e.items.map((i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span className="leading-relaxed">{i}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
