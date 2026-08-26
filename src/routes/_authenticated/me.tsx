import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Award,
  Briefcase,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Github,
  Globe,
  GraduationCap,
  Languages as LanguagesIcon,
  Linkedin,
  MapPin,
  Settings2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Skeleton } from "@/components/ai/skeleton";
import { getWorkspace } from "@/lib/profile.functions";
import { getAvatarUrl } from "@/lib/account.functions";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({ meta: [{ title: "Me · CareerOS" }] }),
  component: MePage,
});

function MePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["workspace"],
    queryFn: () => getWorkspace(),
  });

  const avatarPath = data?.profile?.avatar_url ?? null;
  const { data: avatarSigned } = useQuery({
    queryKey: ["avatar-signed", avatarPath],
    queryFn: () => {
      if (!avatarPath) throw new Error("Avatar path is unavailable");
      return getAvatarUrl({ data: { path: avatarPath } });
    },
    enabled: Boolean(avatarPath),
    staleTime: 5 * 60 * 1000,
  });

  const [copied, setCopied] = useState(false);
  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const initials = useMemo(() => {
    const name = data?.profile?.full_name ?? "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
  }, [data?.profile?.full_name]);

  const groupedSkills = useMemo(() => {
    const m = new Map<string, NonNullable<typeof data>["skills"]>();
    for (const s of data?.skills ?? []) {
      const list = m.get(s.category) ?? [];
      list.push(s);
      m.set(s.category, list);
    }
    return Array.from(m.entries());
  }, [data?.skills]);

  if (isLoading || !data) {

    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-10">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const profile = data.profile;
  const dna = (data.careerDna ?? {}) as Record<string, unknown>;
  const health = (data.careerHealth ?? {}) as Record<string, unknown>;
  const brainReady = !!(data.careerBrain as { ready?: boolean } | null)?.ready
    || Array.isArray(data.experiences) && data.experiences.length > 0;

  const dnaLabel =
    (dna.archetype as string | undefined) ??
    (dna.primary_role as string | undefined) ??
    (profile?.current_title ?? "Career DNA calibrating");
  const matchScore =
    (health.score as number | undefined) ??
    (health.overall as number | undefined) ??
    null;

  const socials = [
    profile?.linkedin_url && { icon: Linkedin, label: "LinkedIn", url: profile.linkedin_url },
    profile?.github_url && { icon: Github, label: "GitHub", url: profile.github_url },
    profile?.portfolio_url && { icon: Globe, label: "Portfolio", url: profile.portfolio_url },
    profile?.website_url && { icon: Globe, label: "Website", url: profile.website_url },
  ].filter(Boolean) as { icon: typeof Globe; label: string; url: string }[];

  const counters = [
    { label: "Experience", value: `${data.experiences.length}` },
    { label: "Projects", value: `${data.projects.length}` },
    { label: "Certifications", value: `${data.certifications.length}` },
    { label: "Achievements", value: `${data.achievements.length}` },
  ];


  const journey = [...data.experiences]
    .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 p-6 md:p-10">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="surface-card relative overflow-hidden p-6 md:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
        />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-elevated font-display text-lg font-semibold uppercase text-primary shadow-[0_10px_30px_-15px_color-mix(in_oklab,var(--primary)_65%,transparent)]">
              {avatarSigned?.url ? (
                <img
                  src={avatarSigned.url}
                  alt={profile?.full_name ?? "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials || <UserRound className="h-6 w-6" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Career Brain
              </p>
              <h1 className="mt-1 truncate font-display text-2xl font-semibold tracking-tight md:text-3xl">
                {profile?.full_name || "Unnamed"}
              </h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {profile?.current_title || "—"}
                {profile?.location && (
                  <>
                    {" "}· <MapPin className="mr-0.5 inline h-3 w-3" />
                    {profile.location}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-xl border border-border bg-elevated px-3 py-2 text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                DNA
              </p>
              <p className="mt-0.5 max-w-[180px] truncate text-sm text-foreground">{dnaLabel}</p>
            </div>
            <MatchRing score={matchScore} ready={brainReady} />
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={onShare}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs text-foreground/85 transition-all hover:-translate-y-[1px] hover:border-primary/40 hover:text-primary"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Link copied" : "Share profile"}
          </button>
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs text-foreground/85 transition-all hover:-translate-y-[1px] hover:border-primary/40 hover:text-primary"
          >
            <Settings2 className="h-3.5 w-3.5" /> Edit profile
          </Link>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs text-foreground/85 transition-all hover:-translate-y-[1px] hover:border-primary/40 hover:text-primary"
          >
            <UserRound className="h-3.5 w-3.5" /> Account
          </Link>
        </div>
      </motion.section>

      {/* About + Socials */}
      <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="surface-card card-interactive p-6">
          <SectionEyebrow>About</SectionEyebrow>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
            {profile?.professional_summary?.trim() || "No summary yet."}
          </p>
        </div>
        <div className="surface-card card-interactive p-6">
          <SectionEyebrow>Links</SectionEyebrow>
          {socials.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No links added.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {socials.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm transition-all hover:-translate-y-[1px] hover:border-primary/40 hover:text-primary"
                  >
                    <s.icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{s.label}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Counters */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {counters.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04, ease }}
            className="surface-card card-interactive p-4 text-center"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {c.label}
            </p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{c.value}</p>
          </motion.div>
        ))}
      </section>

      {/* Skills */}
      <section className="space-y-3">
        <SectionEyebrow>Skills</SectionEyebrow>
        {groupedSkills.length === 0 ? (
          <div className="surface-card p-6 text-sm text-muted-foreground">No skills yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {groupedSkills.map(([category, items]) => (
              <div key={category} className="surface-card card-interactive p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {category}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {items.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center rounded-md border border-border bg-elevated px-2 py-1 text-xs text-foreground/90 transition-all hover:-translate-y-[1px] hover:border-primary/40 hover:text-primary"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Languages */}
      {data.languages.length > 0 && (
        <section className="space-y-3">
          <SectionEyebrow>Languages</SectionEyebrow>
          <div className="surface-card card-interactive p-5">
            <div className="flex flex-wrap gap-2">
              {data.languages.map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1 text-xs text-foreground/90"
                >
                  <LanguagesIcon className="h-3 w-3 text-muted-foreground" />
                  {l.name}
                  {l.proficiency && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      · {l.proficiency}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}


      {/* Experience timeline */}
      <section className="space-y-3">
        <SectionEyebrow>Experience</SectionEyebrow>
        {journey.length === 0 ? (
          <div className="surface-card p-6 text-sm text-muted-foreground">
            No experience captured yet.
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-6">
            {journey.map((w, i) => (
              <motion.li
                key={w.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04, ease }}
                className="relative"
              >
                <span className="absolute -left-[29px] top-2 grid h-4 w-4 place-items-center rounded-full border border-primary/40 bg-background">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <div className="surface-card card-interactive p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-semibold">{w.role}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {w.company}
                        {w.location ? ` · ${w.location}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {[w.start_date, w.is_current ? "Present" : w.end_date]
                        .filter(Boolean)
                        .join(" – ")}
                    </span>
                  </div>
                  {w.responsibilities && w.responsibilities.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-foreground/85">
                      {w.responsibilities.slice(0, 4).map((b, k) => (
                        <li key={k} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/70" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {w.technologies && w.technologies.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {w.technologies.slice(0, 8).map((t: string) => (
                        <span
                          key={t}
                          className="rounded-md border border-border bg-elevated px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </ol>
        )}
      </section>

      {/* Career Journey — education + certifications + achievements */}
      <section className="grid gap-4 md:grid-cols-3">
        <JourneyCard icon={GraduationCap} label="Education" empty="No education yet."
          items={data.education.map((e) => ({
            id: e.id,
            title: e.degree,
            sub: [e.institution, e.field_of_study].filter(Boolean).join(" · "),
            meta: [e.start_date, e.end_date].filter(Boolean).join(" – "),
          }))}
        />
        <JourneyCard icon={Award} label="Certifications" empty="No certifications yet."
          items={data.certifications.map((c) => ({
            id: c.id,
            title: c.name,
            sub: c.organization ?? "",
            meta: c.issue_date ?? "",
          }))}
        />
        <JourneyCard icon={Sparkles} label="Achievements" empty="No achievements yet."
          items={data.achievements.map((a) => ({
            id: a.id,
            title: a.description,
            sub: [a.category, a.date].filter(Boolean).join(" · "),
            meta: "",
          }))}
        />
      </section>

      <div className="pt-2 text-center">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <FileText className="h-4 w-4" /> Edit profile & resume
        </Link>
      </div>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </p>
  );
}

function MatchRing({ score, ready }: { score: number | null; ready: boolean }) {
  const pct = Math.max(0, Math.min(100, score ?? (ready ? 20 : 10)));
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative grid h-16 w-16 shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} className="fill-none stroke-border" strokeWidth="6" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke="url(#ringGrad)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4F8CFF" />
            <stop offset="100%" stopColor="#7C5CFF" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-sm font-semibold tabular-nums">
          {score != null ? score : "—"}
        </span>
      </div>
    </div>
  );
}

function JourneyCard({
  icon: Icon,
  label,
  items,
  empty,
}: {
  icon: typeof Briefcase;
  label: string;
  items: { id: string; title: string; sub: string; meta: string }[];
  empty: string;
}) {
  return (
    <div className="surface-card card-interactive p-5">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-elevated text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <SectionEyebrow>{label}</SectionEyebrow>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.slice(0, 4).map((it) => (
            <li key={it.id} className="border-l-2 border-border pl-3">
              <p className={cn("truncate font-medium text-foreground")}>{it.title}</p>
              {it.sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{it.sub}</p>}
              {it.meta && (
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {it.meta}
                </p>
              )}
            </li>
          ))}
          {items.length > 4 && (
            <li className="pl-3 text-xs text-muted-foreground">
              +{items.length - 4} more
            </li>
          )}
        </ul>
      )}
      <CheckCircle2 className="hidden" />
    </div>
  );
}
