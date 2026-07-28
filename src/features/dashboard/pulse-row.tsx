import type { LucideIcon } from "lucide-react";
import { Bot, Crown, Radar, Send } from "lucide-react";
import { SpringNumber } from "@/components/motion/spring-number";

/**
 * Compact "live pulse" metric strip — the first thing a user sees.
 * Values animate with a spring whenever they change (e.g. on refetch).
 */
export function PulseRow({
  agentsRunning,
  agentsTotal,
  jobsMatched,
  applications,
  plan,
}: {
  agentsRunning: number;
  agentsTotal: number;
  jobsMatched: number;
  applications: number;
  plan: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <PulseTile icon={Bot} label="Agents running" value={agentsRunning} suffix={`/${agentsTotal}`} />
      <PulseTile icon={Radar} label="Jobs matched" value={jobsMatched} />
      <PulseTile icon={Send} label="Applications" value={applications} />
      <PulseTile icon={Crown} label="Plan" value={0} display={plan} />
    </div>
  );
}

function PulseTile({
  icon: Icon,
  label,
  value,
  suffix,
  display,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  display?: string;
}) {
  return (
    <div className="surface-card flex items-center gap-3 p-3.5">
      <span className="icon-halo h-9 w-9 shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-display text-lg font-semibold leading-none tabular-nums">
          {display ? (
            <span className="capitalize">{display}</span>
          ) : (
            <>
              <SpringNumber value={value} />
              {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function PulseRowSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="surface-card h-[60px] animate-pulse p-3.5" />
      ))}
    </div>
  );
}
