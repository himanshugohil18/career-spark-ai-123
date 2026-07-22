import { cn } from "@/lib/utils";

export type MissingSkill = { skill: string; priority: "high" | "medium" | "low" };

export function MissingSkills({ skills, className }: { skills: MissingSkill[]; className?: string }) {
  if (!skills?.length) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No skill gaps detected for this role.
      </p>
    );
  }
  const groups: Record<"high" | "medium" | "low", MissingSkill[]> = { high: [], medium: [], low: [] };
  for (const s of skills) groups[s.priority].push(s);
  return (
    <div className={cn("space-y-3", className)}>
      {(["high", "medium", "low"] as const).map((p) =>
        groups[p].length ? (
          <div key={p}>
            <p
              className={cn(
                "mb-2 font-mono text-[10px] uppercase tracking-widest",
                p === "high" ? "text-destructive" : p === "medium" ? "text-warning" : "text-muted-foreground",
              )}
            >
              {p} priority
            </p>
            <div className="flex flex-wrap gap-1.5">
              {groups[p].map((s) => (
                <span
                  key={s.skill}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs",
                    p === "high"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : p === "medium"
                      ? "border-warning/40 bg-warning/10 text-warning"
                      : "border-border bg-elevated text-foreground/80",
                  )}
                >
                  {s.skill}
                </span>
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
