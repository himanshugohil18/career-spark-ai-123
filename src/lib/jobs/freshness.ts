/**
 * Job freshness model — pure, isomorphic helpers.
 *
 * Source of truth for "how current is this listing?".
 *
 *   posted_at        — date the SOURCE says the job was published (may be null)
 *   first_seen_at    — first time our discovery crawl saw it
 *   last_verified_at — last time a crawl re-confirmed it is still published
 *   expires_at       — closing date, when the source publishes one
 *
 * A nightly sweep (`public.sweep_stale_jobs`) deactivates listings that have
 * expired or have not been re-confirmed for 21 days, so anything reaching the
 * UI is at most three weeks unverified.
 */

export const STALE_AFTER_DAYS = 21;
export const AGING_AFTER_DAYS = 7;
/**
 * Hard recency ceiling for anything shown in the feed or recommendations.
 * Postings published more than this many days ago are never surfaced, so
 * users never see months-old or year-old advertisements.
 */
export const MAX_FEED_AGE_DAYS = 30;

export type FreshnessTier = "fresh" | "recent" | "aging" | "stale" | "expired";

export type JobFreshnessInput = {
  posted_at?: string | null;
  first_seen_at?: string | null;
  last_verified_at?: string | null;
  last_seen_at?: string | null;
  expires_at?: string | null;
  stale_reason?: string | null;
};

export type JobFreshness = {
  tier: FreshnessTier;
  /** e.g. "Posted 3d ago" — the source's own publication date when known. */
  postedLabel: string | null;
  /** e.g. "Verified today" — when our crawler last confirmed the listing. */
  verifiedLabel: string;
  /** Days since last verification, rounded down. */
  daysSinceVerified: number;
  /** True when the listing should carry a caution note in the UI. */
  needsCaution: boolean;
};

function daysBetween(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

export function relativeDays(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function jobFreshness(job: JobFreshnessInput, now: number = Date.now()): JobFreshness {
  const verifiedDays =
    daysBetween(job.last_verified_at, now) ??
    daysBetween(job.last_seen_at, now) ??
    daysBetween(job.first_seen_at, now) ??
    0;
  const postedDays = daysBetween(job.posted_at, now);

  const expired =
    !!job.expires_at && Number.isFinite(Date.parse(job.expires_at)) && Date.parse(job.expires_at) < now;

  let tier: FreshnessTier;
  if (expired || job.stale_reason === "expired") tier = "expired";
  else if (verifiedDays >= STALE_AFTER_DAYS || job.stale_reason) tier = "stale";
  else if (verifiedDays > AGING_AFTER_DAYS) tier = "aging";
  else if (verifiedDays > 1 || (postedDays ?? 0) > 3) tier = "recent";
  else tier = "fresh";

  return {
    tier,
    postedLabel: postedDays === null ? null : `Posted ${relativeDays(postedDays)}`,
    verifiedLabel: `Verified ${relativeDays(verifiedDays)}`,
    daysSinceVerified: verifiedDays,
    needsCaution: tier === "stale" || tier === "expired",
  };
}

export const FRESHNESS_STYLES: Record<FreshnessTier, { label: string; className: string }> = {
  fresh: {
    label: "Fresh",
    className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  recent: {
    label: "Recent",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  aging: {
    label: "Aging",
    className: "border-amber-500/35 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  stale: {
    label: "Unverified",
    className: "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  expired: {
    label: "Closed",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
};
