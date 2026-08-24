import { BadgeCheck, Compass, Layers, TrendingUp } from "lucide-react";
import type { CareerBrainSnapshot } from "@/lib/career-brain.service";
import { deriveCareerProfile } from "@/lib/career-profile";

/**
 * Truth / source transparency strip: shows exactly what the matching engine
 * believes about the user — domain, seniority, and the signals it used —
 * so match scores are never a black box.
 */
export function CareerSignal({
  brain,
}: {
  brain: CareerBrainSnapshot | null | undefined;
}) {
  const profile = deriveCareerProfile(brain);
  if (!profile.domainLabel && !profile.seniorityLabel) return null;

  const confidencePct = Math.round(profile.confidence * 100);

  return (
    <section
      aria-label="How CareerOS is matching you"
      className="surface-card flex flex-col gap-3 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Matching you as
        </span>
        {profile.domainLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Compass className="h-3 w-3" />
            {profile.domainLabel}
          </span>
        )}
        {profile.seniorityLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-2.5 py-1 text-xs text-foreground">
            <TrendingUp className="h-3 w-3" />
            {profile.seniorityLabel}
            {profile.years != null && ` · ${profile.years} yr${profile.years === 1 ? "" : "s"}`}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5 text-primary" />
          {confidencePct}% confidence
        </span>
      </div>

      {profile.coreSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Layers className="h-3 w-3 text-muted-foreground" />
          {profile.coreSkills.map((s) => (
            <span
              key={s}
              className="rounded-md border border-border bg-elevated px-2 py-0.5 text-[11px] text-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Derived from your active resume — {profile.signals.join(" · ")}
        {profile.adjacentDomains.length > 0 && (
          <>
            {" · also showing "}
            {profile.adjacentDomains.join(", ")}
          </>
        )}
        . Re-upload or edit your resume to change this.
      </p>
    </section>
  );
}
