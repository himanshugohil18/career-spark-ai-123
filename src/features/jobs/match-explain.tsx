import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sparkles, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MatchBreakdown } from "./match-breakdown";

type MissingSkill = { skill: string; priority: "high" | "medium" | "low" };

export type MatchExplainData = {
  overall_score?: number | null;
  skill_score?: number | null;
  experience_score?: number | null;
  technology_score?: number | null;
  career_goal_score?: number | null;
  location_score?: number | null;
  salary_score?: number | null;
  education_score?: number | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  missing_skills?: MissingSkill[] | null;
  explanation?: string | null;
};

export function MatchExplain({
  match,
  insights,
  defaultOpen = false,
  className,
}: {
  match: MatchExplainData | null;
  insights?: string[];
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!match) return null;

  return (
    <div className={cn("mt-3 rounded-xl border border-border/60 bg-background/40", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Why this match
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-4 pt-1">
              {match.explanation && (
                <p className="text-[13px] leading-relaxed text-foreground/85">{match.explanation}</p>
              )}

              {insights && insights.length > 0 && (
                <div className="space-y-1.5">
                  {insights.map((i) => (
                    <div key={i} className="flex items-start gap-2 text-[12px] text-foreground/85">
                      <Target className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <span>{i}</span>
                    </div>
                  ))}
                </div>
              )}

              <MatchBreakdown match={match as Record<string, unknown>} />

              {((match.strengths ?? []).length > 0 || (match.weaknesses ?? []).length > 0) && (
                <div className="grid gap-3 md:grid-cols-2">
                  {(match.strengths ?? []).length > 0 && (
                    <div>
                      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-success">
                        <TrendingUp className="mr-1 inline h-3 w-3" /> Strengths
                      </p>
                      <ul className="space-y-1 text-[12px] text-foreground/85">
                        {(match.strengths ?? []).slice(0, 4).map((s) => (
                          <li key={s}>· {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(match.weaknesses ?? []).length > 0 && (
                    <div>
                      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-warning">
                        Where to grow
                      </p>
                      <ul className="space-y-1 text-[12px] text-foreground/85">
                        {(match.weaknesses ?? []).slice(0, 4).map((s) => (
                          <li key={s}>· {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {(match.missing_skills ?? []).length > 0 && (
                <div>
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Missing skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(match.missing_skills ?? []).map((m) => (
                      <span
                        key={m.skill}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px]",
                          m.priority === "high"
                            ? "border-warning/40 bg-warning/10 text-warning"
                            : m.priority === "medium"
                              ? "border-accent/40 bg-accent/10 text-accent"
                              : "border-border bg-elevated text-muted-foreground",
                        )}
                      >
                        {m.skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
