import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bookmark, MapPin, Building2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { MatchRing } from "./match-ring";
import { MatchExplain } from "./match-explain";
import { ApplyWithAiButton } from "@/features/auto-apply/apply-with-ai-button";
import { cn } from "@/lib/utils";
import { openExternal, isValidExternalUrl } from "@/lib/open-external";
import { BurstButton } from "@/components/motion/burst-button";
import { jobFreshness, FRESHNESS_STYLES } from "@/lib/jobs/freshness";


export type JobCardData = {
  id: string;
  title: string;
  location: string | null;
  remote_status: string;
  posted_at: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  application_url: string;
  provider: string;
  company: { name?: string; logo_url?: string | null } | null;
  match?: {
    overall_score: number | null;
    skill_score?: number | null;
    experience_score?: number | null;
    technology_score?: number | null;
    career_goal_score?: number | null;
    location_score?: number | null;
    salary_score?: number | null;
    education_score?: number | null;
    strengths?: string[] | null;
    weaknesses?: string[] | null;
    missing_skills?: Array<{ skill: string; priority: "high" | "medium" | "low" }> | null;
    explanation?: string | null;
  } | null;
  savedStatus?: string | null;
  /** Location proximity, computed server-side against the resume location. */
  locationTier?: "same-city" | "nearby-city" | "same-country" | "remote" | "far" | null;
  locationLabel?: string | null;
  /** Freshness telemetry — see src/lib/jobs/freshness.ts */
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  last_verified_at?: string | null;
  expires_at?: string | null;
  stale_reason?: string | null;
};

function formatSalary(job: JobCardData): string | null {
  if (!job.salary_max && !job.salary_min) return null;
  const currency = job.salary_currency ?? "USD";
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  if (job.salary_min && job.salary_max) return `${currency} ${fmt(job.salary_min)}–${fmt(job.salary_max)}`;
  const only = job.salary_max ?? job.salary_min ?? 0;
  return `${currency} ${fmt(only)}`;
}

export function JobCard({
  job,
  onSave,
  onClick,
  insights,
}: {
  job: JobCardData;
  onSave?: (id: string) => void;
  onClick?: (id: string) => void;
  insights?: string[];
}) {
  const navigate = useNavigate();
  const salary = formatSalary(job);
  const freshness = jobFreshness(job);
  const freshStyle = FRESHNESS_STYLES[freshness.tier];
  const overall = Number(job.match?.overall_score ?? 0);
  const hasValidId = typeof job.id === "string" && job.id.length > 0;
  const hasApplyUrl = isValidExternalUrl(job.application_url);
  const initials = (job.company?.name ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const goToDetails = () => {
    if (!hasValidId) {
      toast.error("This job is missing an identifier and can't be opened.");
      console.warn("JobCard: missing job.id", job);
      return;
    }
    onClick?.(job.id);
    void navigate({ to: "/jobs/$jobId", params: { jobId: job.id } }).catch((err) => {
      console.error("Navigation to job detail failed", err);
      toast.error("Could not open job details.");
    });
  };

  return (

    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.006 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="surface-card card-interactive group relative flex flex-col gap-3 p-5"
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--color-primary) 28%, transparent), transparent 70%)" }}
      />
      {overall >= 90 && <span className="ribbon">Top Match</span>}
      <div className="flex items-start gap-4">
        {job.match ? (
          <MatchRing value={overall} size={56} />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-border font-mono text-[10px] text-muted-foreground">
            NEW
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {job.company?.logo_url ? (
                  <img
                    src={job.company.logo_url}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded border border-border bg-elevated object-contain"
                  />
                ) : (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded border border-border bg-elevated font-mono text-[9px] text-muted-foreground">
                    {initials || <Building2 className="h-3 w-3" />}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    goToDetails();
                  }}
                  className="line-clamp-1 truncate text-left font-display text-base font-semibold text-foreground transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!hasValidId}
                  title={hasValidId ? job.title : "Job identifier missing"}
                >
                  {job.title}
                </button>

              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {job.company?.name ?? "—"}
                </span>
                {job.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {job.location}
                  </span>
                )}
                {(job.locationTier === "same-city" || job.locationTier === "nearby-city") && job.locationLabel && (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {job.locationLabel}
                  </span>
                )}
                {job.remote_status && job.remote_status !== "unknown" && (
                  <span className="rounded-full border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                    {job.remote_status}
                  </span>
                )}

                {salary && <span className="text-foreground/70">{salary}</span>}
                <span
                  className={
                    "rounded-full border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest " +
                    freshStyle.className
                  }
                  title={`${freshness.verifiedLabel} from ${job.provider}`}
                >
                  {freshStyle.label}
                </span>
                <span className="text-[11px] text-muted-foreground/80">
                  {freshness.postedLabel ?? freshness.verifiedLabel} · {job.provider}
                </span>
              </div>

              {job.match?.strengths?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.match.strengths.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <BurstButton
                active={Boolean(job.savedStatus)}
                onClick={(e) => {
                  e.preventDefault();
                  onSave?.(job.id);
                }}
                ariaLabel="Save job"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground",
                  job.savedStatus && "border-primary/40 text-primary",
                )}
              >
                <Bookmark className={cn("h-3.5 w-3.5", job.savedStatus && "fill-current")} />
              </BurstButton>
              <button
                type="button"
                aria-label={hasApplyUrl ? "Open original job posting" : "Application link unavailable"}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors",
                  hasApplyUrl ? "hover:text-foreground" : "cursor-not-allowed opacity-40",
                )}
                disabled={!hasApplyUrl}
                title={hasApplyUrl ? "Open original posting" : "Application link unavailable"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!hasApplyUrl) {
                    toast.error("Application link unavailable");
                    return;
                  }
                  openExternal(job.application_url);
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

            </div>
          </div>
        </div>
      </div>
      {job.match && <MatchExplain match={job.match} insights={insights} />}
      <div className="mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            goToDetails();
          }}
          disabled={!hasValidId}
          className="sheen-on-hover inline-flex h-9 items-center rounded-md border border-border bg-elevated px-3 text-[13px] text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          View details
        </button>

        <ApplyWithAiButton
          jobId={job.id}
          unavailableReason={job.application_url ? null : "This role has no direct application URL, so the AI agent can't complete it end-to-end."}
        />
      </div>
    </motion.article>
  );
}
