/**
 * Roadmap Engine — target role wizard, AI-generated roadmap with phases,
 * interactive career graph, per-item status tracking, and project
 * recommendations grounded in real skill gaps.
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Circle,
  FlaskConical,
  GraduationCap,
  Loader2,
  MapPin,
  Play,
  Rocket,
  SkipForward,
  Sparkles,
  Target,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  addRoadmapItem,
  createRoadmap,
  generateProjects,
  getRoadmap,
  updateProjectStatus,
  updateRoadmapItemStatus,
} from "@/lib/roadmap.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell, SectionHeading } from "@/components/product/page-header";
import { Skeleton } from "@/components/ai/skeleton";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({ meta: [{ title: "Career Roadmap · CareerOS" }] }),
  component: RoadmapPage,
});

type RoadmapRow = {
  id: string;
  title: string;
  present_role: string | null;
  target_role: string | null;
  target_location: string | null;
  target_salary: string | null;
  target_timeline: string | null;
  progress: number;
};
type ItemRow = {
  id: string;
  phase: number;
  phase_label: string | null;
  title: string;
  description: string | null;
  item_type: string;
  skills: string[] | null;
  status: string;
};
type ProjectRow = {
  id: string;
  name: string;
  difficulty: string | null;
  description: string | null;
  why_recommended: string | null;
  skills_covered: string[] | null;
  tech_stack: string[] | null;
  learning_goals: string[] | null;
  checklist: Array<{ label: string; done: boolean }> | null;
  status: string;
};

const TYPE_ICON: Record<string, typeof Wrench> = {
  skill: Wrench,
  project: FlaskConical,
  experience: Briefcase,
  learning: GraduationCap,
};

const STATUS_CYCLE: Record<string, string> = {
  not_started: "in_progress",
  in_progress: "completed",
  completed: "not_started",
  skipped: "not_started",
};

function RoadmapPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["roadmap"],
    queryFn: () => getRoadmap(),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["roadmap"] });

  const itemMutation = useMutation({
    mutationFn: (v: { itemId: string; status: string }) =>
      updateRoadmapItemStatus({
        data: {
          itemId: v.itemId,
          status: v.status as "not_started" | "in_progress" | "completed" | "skipped",
        },
      }),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["command-center"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const projectsMutation = useMutation({
    mutationFn: () => generateProjects(),
    onSuccess: (r) => {
      toast.success(`Generated ${r.count} project recommendation${r.count === 1 ? "" : "s"}`);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const projectStatusMutation = useMutation({
    mutationFn: (v: { projectId: string; status: string }) =>
      updateProjectStatus({
        data: { projectId: v.projectId, status: v.status as "planned" | "in_progress" | "completed" },
      }),
    onSuccess: invalidate,
  });

  if (isLoading) {
    return (
      <PageShell width="wide" className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </PageShell>
    );
  }

  const roadmap = (data?.roadmap ?? null) as RoadmapRow | null;
  const items = (data?.items ?? []) as ItemRow[];
  const projects = (data?.projects ?? []) as ProjectRow[];

  return (
    <PageShell width="wide" className="space-y-8">
      {!roadmap ? (
        <RoadmapWizard onCreated={invalidate} />
      ) : (
        <>
          {/* Header */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
            className="flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between"
          >
            <div className="min-w-0">
              <p className="meta-text">Career Roadmap</p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{roadmap.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {roadmap.target_role && (
                  <span className="stage-chip">
                    <Target className="h-3.5 w-3.5 text-primary" /> {roadmap.target_role}
                  </span>
                )}
                {roadmap.target_location && (
                  <span className="stage-chip">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {roadmap.target_location}
                  </span>
                )}
                {roadmap.target_salary && (
                  <span className="stage-chip">
                    <Wallet className="h-3.5 w-3.5 text-primary" /> {roadmap.target_salary}
                  </span>
                )}
                {roadmap.target_timeline && <span className="stage-chip">{roadmap.target_timeline}</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-border bg-card p-4 pr-6 shadow-soft">
              <div className="relative">
                <svg width={64} height={64} viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" strokeWidth="6" className="stroke-border" />
                  <circle
                    cx="32" cy="32" r="26" fill="none" strokeWidth="6"
                    strokeDasharray={`${(roadmap.progress / 100) * 163.4} 163.4`}
                    strokeLinecap="round"
                    transform="rotate(-90 32 32)"
                    className="stroke-primary transition-all duration-700"
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-mono text-sm font-semibold">
                  {roadmap.progress}%
                </span>
              </div>
              <div>
                <p className="section-label">Progress</p>
                <p className="mt-0.5 text-sm font-medium">
                  {items.filter((i) => i.status === "completed").length}/{items.length} steps complete
                </p>
              </div>
            </div>
          </motion.section>

          {/* Career Graph */}
          {items.length > 0 && <CareerGraph roadmap={roadmap} items={items} />}

          {/* Phase board */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease }}
            className="space-y-4"
          >
            <SectionHeading
              title="Your roadmap"
              description="Click a step to advance it. CareerOS tracks your progress against your target role."
            />
            {groupByPhase(items).map((group) => {
              const done = group.items.filter((i) => i.status === "completed").length;
              return (
                <div key={group.phase} className="surface-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-semibold text-primary">
                        {group.phase}
                      </span>
                      <p className="text-sm font-semibold">{group.label}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {done}/{group.items.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {group.items.map((item) => {
                      const Icon = TYPE_ICON[item.item_type] ?? Wrench;
                      const complete = item.status === "completed";
                      const inProgress = item.status === "in_progress";
                      return (
                        <li key={item.id} className="flex items-start gap-3 px-5 py-4">
                          <button
                            onClick={() =>
                              itemMutation.mutate({ itemId: item.id, status: STATUS_CYCLE[item.status] ?? "in_progress" })
                            }
                            className="mt-0.5 shrink-0"
                            aria-label={`Advance ${item.title}`}
                          >
                            {complete ? (
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            ) : inProgress ? (
                              <span className="block h-5 w-5 rounded-full border-2 border-primary bg-primary/20" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground/50" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-primary" />
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  complete ? "text-muted-foreground line-through" : "text-foreground",
                                )}
                              >
                                {item.title}
                              </p>
                              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                {item.item_type}
                              </span>
                            </div>
                            {item.description && (
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                            )}
                            {(item.skills ?? []).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {item.skills!.map((s) => (
                                  <span key={s} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            {item.status === "not_started" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => itemMutation.mutate({ itemId: item.id, status: "in_progress" })}
                              >
                                <Play className="h-3.5 w-3.5" /> Start
                              </Button>
                            )}
                            {!complete && item.status !== "skipped" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => itemMutation.mutate({ itemId: item.id, status: "skipped" })}
                              >
                                <SkipForward className="h-3.5 w-3.5" /> Skip
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            <AddItemRow roadmapId={roadmap.id} maxPhase={Math.max(1, ...items.map((i) => i.phase))} onAdded={invalidate} />
          </motion.section>

          {/* Project recommendations */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionHeading
                title="Project recommendations"
                description="Built from your real skill gaps and target role — each strengthens a missing skill."
              />
              <Button
                variant="primary"
                onClick={() => projectsMutation.mutate()}
                disabled={projectsMutation.isPending}
              >
                {projectsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {projects.length ? "Regenerate projects" : "Generate projects"}
              </Button>
            </div>
            {projects.length === 0 ? (
              <div className="surface-card p-6">
                <p className="text-sm text-muted-foreground">
                  No project ideas yet. Generate them from your Career Brain and skill gaps, and each project will
                  include a description, tech stack, learning goals and a checklist.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {projects.map((p) => (
                  <div key={p.id} className="surface-card flex flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[15px] font-semibold leading-snug">{p.name}</p>
                      {p.difficulty && (
                        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {p.difficulty}
                        </span>
                      )}
                    </div>
                    {p.why_recommended && (
                      <p className="mt-2 text-xs leading-relaxed text-primary">{p.why_recommended}</p>
                    )}
                    {p.description && (
                      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">{p.description}</p>
                    )}
                    {(p.skills_covered ?? []).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.skills_covered!.slice(0, 5).map((s) => (
                          <span key={s} className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {(p.checklist ?? []).length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                        {p.checklist!.slice(0, 4).map((c) => (
                          <li key={c.label} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className={cn("mt-0.5 h-3 w-3 shrink-0 rounded-full border", c.done ? "border-success bg-success/30" : "border-border")} />
                            {c.label}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-4 flex gap-2 border-t border-border pt-3">
                      {p.status === "suggested" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => projectStatusMutation.mutate({ projectId: p.id, status: "planned" })}
                        >
                          <Play className="h-3.5 w-3.5" /> Start project
                        </Button>
                      )}
                      {p.status === "planned" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => projectStatusMutation.mutate({ projectId: p.id, status: "in_progress" })}
                        >
                          Begin work
                        </Button>
                      )}
                      {p.status === "in_progress" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => projectStatusMutation.mutate({ projectId: p.id, status: "completed" })}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark complete
                        </Button>
                      )}
                      {p.status === "completed" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Job board integration */}
          <div className="surface-highlight flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
            <div>
              <p className="section-label text-primary">Roadmap → Job board</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Your target role powers job matching. Missing skills from your top matches feed back into this
                roadmap automatically.
              </p>
            </div>
            <Button variant="primary" asChild>
              <Link to="/jobs">
                View matched jobs <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </PageShell>
  );
}

function groupByPhase(items: ItemRow[]) {
  const map = new Map<number, { phase: number; label: string; items: ItemRow[] }>();
  for (const item of items) {
    const g = map.get(item.phase) ?? {
      phase: item.phase,
      label: item.phase_label || `Phase ${item.phase}`,
      items: [],
    };
    g.items.push(item);
    if (item.phase_label && g.label === `Phase ${item.phase}`) g.label = item.phase_label;
    map.set(item.phase, g);
  }
  return [...map.values()].sort((a, b) => a.phase - b.phase);
}

/** SVG career graph: current role → phase nodes → target role. */
function CareerGraph({ roadmap, items }: { roadmap: RoadmapRow; items: ItemRow[] }) {
  const phases = groupByPhase(items);
  const nodes = [
    { label: roadmap.present_role ?? "Today", kind: "current" as const, progress: 100 },
    ...phases.map((g) => ({
      label: g.label,
      kind: "phase" as const,
      progress: g.items.length
        ? Math.round((g.items.filter((i) => i.status === "completed").length / g.items.length) * 100)
        : 0,
    })),
    { label: roadmap.target_role ?? "Target", kind: "target" as const, progress: 0 },
  ];

  const W = 220 * nodes.length;
  const H = 160;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.03, ease }}
      className="surface-card overflow-x-auto p-6"
    >
      <p className="section-label">Career graph</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="mt-4 min-w-[640px]" role="img" aria-label="Career graph">
        {nodes.map((n, i) => {
          const x = i * 220 + 110;
          const y = 80;
          return (
            <g key={`${n.kind}-${i}`}>
              {i > 0 && (
                <line
                  x1={x - 220 + 110}
                  y1={y}
                  x2={x - 110}
                  y2={y}
                  strokeWidth={2}
                  strokeDasharray={n.progress > 0 ? "none" : "5 5"}
                  className="stroke-primary/40"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={n.kind === "current" || n.kind === "target" ? 26 : 20}
                className={
                  n.kind === "target"
                    ? "fill-primary stroke-primary"
                    : n.kind === "current"
                      ? "fill-success/20 stroke-success"
                      : n.progress >= 100
                        ? "fill-success/20 stroke-success"
                        : n.progress > 0
                          ? "fill-primary/15 stroke-primary"
                          : "fill-card stroke-border"
                }
                strokeWidth={2}
              />
              {n.kind === "phase" && (
                <text x={x} y={y + 4} textAnchor="middle" className="fill-foreground font-mono text-[11px]">
                  {n.progress}%
                </text>
              )}
              {n.kind === "current" && (
                <text x={x} y={y + 4} textAnchor="middle" className="fill-success text-[12px]">✓</text>
              )}
              {n.kind === "target" && (
                <text x={x} y={y + 4} textAnchor="middle" className="fill-primary-foreground text-[12px]">◎</text>
              )}
              <foreignObject x={x - 90} y={y + 36} width={180} height={40}>
                <p className="text-center text-[11px] font-medium leading-tight text-foreground">{n.label}</p>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </motion.section>
  );
}

function RoadmapWizard({ onCreated }: { onCreated: () => void }) {
  const [targetRole, setTargetRole] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [targetSalary, setTargetSalary] = useState("");
  const [targetTimeline, setTargetTimeline] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createRoadmap({
        data: {
          targetRole: targetRole.trim(),
          targetLocation: targetLocation.trim() || undefined,
          targetSalary: targetSalary.trim() || undefined,
          targetTimeline: targetTimeline.trim() || undefined,
        },
      }),
    onSuccess: (r) => {
      toast.success(`Roadmap created with ${r.itemCount} steps`);
      onCreated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create roadmap"),
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
      className="mx-auto max-w-2xl"
    >
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Rocket className="h-7 w-7" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">Build your career roadmap</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Tell CareerOS where you want to be. It builds a phased plan from your Career Brain — skills to learn,
          projects to build, and milestones to hit.
        </p>
      </div>
      <div className="surface-card mt-8 space-y-5 p-6 md:p-8">
        <div className="space-y-2">
          <Label htmlFor="target-role">Target role *</Label>
          <Input
            id="target-role"
            placeholder="e.g. Senior Frontend Engineer"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="target-location">Location</Label>
            <Input
              id="target-location"
              placeholder="e.g. Remote"
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-salary">Salary goal</Label>
            <Input
              id="target-salary"
              placeholder="e.g. ₹24 LPA"
              value={targetSalary}
              onChange={(e) => setTargetSalary(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-timeline">Timeline</Label>
            <Input
              id="target-timeline"
              placeholder="e.g. 12 months"
              value={targetTimeline}
              onChange={(e) => setTargetTimeline(e.target.value)}
            />
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={targetRole.trim().length < 2 || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Building your roadmap…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate my roadmap
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Uses your Career Brain as the starting point. No data? Upload your resume first.
        </p>
      </div>
    </motion.section>
  );
}

function AddItemRow({
  roadmapId,
  maxPhase,
  onAdded,
}: {
  roadmapId: string;
  maxPhase: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState(maxPhase);

  const add = useMutation({
    mutationFn: () => addRoadmapItem({ data: { roadmapId, title: title.trim(), phase } }),
    onSuccess: () => {
      setTitle("");
      setOpen(false);
      onAdded();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add step"),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        + Add a custom step
      </button>
    );
  }
  return (
    <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="custom-step">Step title</Label>
        <Input
          id="custom-step"
          placeholder="e.g. Earn AWS Cloud Practitioner"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="w-full space-y-1.5 sm:w-32">
        <Label htmlFor="custom-phase">Phase</Label>
        <Input
          id="custom-phase"
          type="number"
          min={1}
          max={10}
          value={phase}
          onChange={(e) => setPhase(Math.max(1, Number(e.target.value) || 1))}
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={title.trim().length < 2 || add.isPending}
          onClick={() => add.mutate()}
        >
          Add
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
