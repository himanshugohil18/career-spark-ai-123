import { cn } from "@/lib/utils";

const ROWS: Array<{ key: string; label: string }> = [
  { key: "skill_score", label: "Skills" },
  { key: "experience_score", label: "Experience" },
  { key: "technology_score", label: "Technology" },
  { key: "career_goal_score", label: "Career Goal" },
  { key: "location_score", label: "Location" },
  { key: "salary_score", label: "Salary" },
  { key: "education_score", label: "Education" },
];

export function MatchBreakdown({ match, className }: { match: Record<string, unknown> | null; className?: string }) {
  if (!match) return null;
  return (
    <div className={cn("space-y-3", className)}>
      {ROWS.map((r) => {
        const v = Math.round(Number(match[r.key] ?? 0));
        const tone = v >= 80 ? "bg-success" : v >= 60 ? "bg-primary" : v >= 40 ? "bg-accent" : "bg-warning";
        return (
          <div key={r.key}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className="font-mono text-[11px] tabular-nums text-foreground/80">{v}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div className={cn("h-full rounded-full transition-all duration-500", tone)} style={{ width: `${v}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
