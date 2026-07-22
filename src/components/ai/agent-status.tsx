import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  FileText,
  Radar,
  Briefcase,
  MessagesSquare,
  GraduationCap,
  Users,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentState =
  | "active"
  | "ready"
  | "idle"
  | "waiting"
  | "standby"
  | "locked";

const STATE_STYLES: Record<
  AgentState,
  { dot: string; label: string; text: string; ring: string }
> = {
  active: {
    dot: "bg-success",
    label: "Active",
    text: "text-success",
    ring: "ring-success/30",
  },
  ready: {
    dot: "bg-primary",
    label: "Ready",
    text: "text-primary",
    ring: "ring-primary/30",
  },
  waiting: {
    dot: "bg-warning",
    label: "Waiting",
    text: "text-warning",
    ring: "ring-warning/30",
  },
  idle: {
    dot: "bg-muted-foreground",
    label: "Idle",
    text: "text-muted-foreground",
    ring: "ring-border",
  },
  standby: {
    dot: "bg-accent",
    label: "Standby",
    text: "text-accent",
    ring: "ring-accent/30",
  },
  locked: {
    dot: "bg-muted-foreground/40",
    label: "Locked",
    text: "text-muted-foreground/70",
    ring: "ring-border",
  },
};

export function AgentStatusDot({ state }: { state: AgentState }) {
  const s = STATE_STYLES[state];
  const animated = state === "active" || state === "ready" || state === "waiting";
  return (
    <span className={cn("relative inline-flex h-2 w-2 items-center justify-center")}>
      {animated && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 2.4 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className={cn("absolute inset-0 rounded-full", s.dot)}
        />
      )}
      <span className={cn("relative h-2 w-2 rounded-full", s.dot)} />
    </span>
  );
}

export function AgentStatusPill({ state }: { state: AgentState }) {
  const s = STATE_STYLES[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-elevated/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
        s.text,
      )}
    >
      <AgentStatusDot state={state} />
      {s.label}
    </span>
  );
}

export type Agent = {
  name: string;
  role: string;
  state: AgentState;
  icon: LucideIcon;
};

export const DEFAULT_AGENTS: Agent[] = [
  { name: "Resume Agent", role: "Structures your experience", state: "waiting", icon: FileText },
  { name: "Career Agent", role: "Maintains your Career Brain", state: "ready", icon: Brain },
  { name: "Job Agent", role: "Discovers matched roles", state: "idle", icon: Radar },
  { name: "Application Agent", role: "Prepares & submits", state: "standby", icon: Briefcase },
  { name: "Interview Agent", role: "Adaptive mock interviews", state: "locked", icon: MessagesSquare },
  { name: "Coach Agent", role: "Long-term career strategy", state: "ready", icon: Users },
  { name: "Learning Agent", role: "Personalized skill paths", state: "ready", icon: GraduationCap },
];

/**
 * Derive live agent states from real user activity signals. Consumed by the
 * dashboard so the grid reflects what each agent is actually doing right now
 * (matches ranked, applications in flight, interview sessions active, etc.).
 */
export type AgentActivity = {
  hasResume?: boolean;
  hasParsedPendingReview?: boolean;
  brainVersion?: number | null;
  skillCount?: number;
  matchCount?: number;
  highMatchCount?: number;
  workspaceCount?: number;
  readyWorkspaceCount?: number;
  interviewSessionCount?: number;
  practicedQuestionCount?: number;
  gapCount?: number;
};

export function deriveAgents(a: AgentActivity): Agent[] {
  const hasResume = !!a.hasResume;
  const hasBrain = hasResume && (a.brainVersion ?? 0) > 0;
  const roleFor = (defaultRole: string, live?: string) => (hasResume && live ? live : defaultRole);

  const resumeState: AgentState = hasResume ? "active" : a.hasParsedPendingReview ? "waiting" : "waiting";
  const careerState: AgentState = hasBrain ? "active" : hasResume ? "ready" : "idle";
  const jobState: AgentState = (a.highMatchCount ?? 0) > 0 ? "active" : (a.matchCount ?? 0) > 0 ? "ready" : hasResume ? "standby" : "idle";
  const appState: AgentState = (a.readyWorkspaceCount ?? 0) > 0 ? "active" : (a.workspaceCount ?? 0) > 0 ? "ready" : hasResume ? "standby" : "idle";
  const interviewState: AgentState = (a.interviewSessionCount ?? 0) > 0 ? "active" : (a.workspaceCount ?? 0) > 0 ? "ready" : "locked";
  const coachState: AgentState = hasBrain ? "active" : hasResume ? "ready" : "idle";
  const learningState: AgentState = (a.gapCount ?? 0) > 0 || (a.matchCount ?? 0) > 0 ? "active" : hasBrain ? "ready" : "idle";

  return [
    { name: "Resume Agent", role: roleFor("Structures your experience", hasResume ? "Career Brain approved" : "Awaiting your resume"), state: resumeState, icon: FileText },
    { name: "Career Agent", role: roleFor("Maintains your Career Brain", hasBrain ? `Brain v${a.brainVersion} · ${a.skillCount ?? 0} skills` : "Ready to build your Brain"), state: careerState, icon: Brain },
    { name: "Job Agent", role: roleFor("Discovers matched roles", (a.matchCount ?? 0) > 0 ? `${a.matchCount} ranked · ${a.highMatchCount ?? 0} strong` : "Watching for new roles"), state: jobState, icon: Radar },
    { name: "Application Agent", role: roleFor("Prepares & submits", (a.workspaceCount ?? 0) > 0 ? `${a.workspaceCount} in flight · ${a.readyWorkspaceCount ?? 0} ready` : "Waiting on your first application"), state: appState, icon: Briefcase },
    { name: "Interview Agent", role: roleFor("Adaptive mock interviews", (a.interviewSessionCount ?? 0) > 0 ? `${a.interviewSessionCount} sessions · ${a.practicedQuestionCount ?? 0} practiced` : "Unlocks with a workspace"), state: interviewState, icon: MessagesSquare },
    { name: "Coach Agent", role: roleFor("Long-term career strategy", hasBrain ? "Briefing refreshed on every visit" : "Ready to coach"), state: coachState, icon: Users },
    { name: "Learning Agent", role: roleFor("Personalized skill paths", (a.gapCount ?? 0) > 0 ? `${a.gapCount} gap analyses feeding your path` : "Ranking skill gaps"), state: learningState, icon: GraduationCap },
  ];
}


export function AgentCard({ agent, index = 0 }: { agent: Agent; index?: number }) {
  const s = STATE_STYLES[agent.state];
  const Icon = agent.state === "locked" ? Lock : agent.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className={cn(
        "group surface-card relative flex items-start gap-4 p-4 transition-colors",
        agent.state === "locked" ? "opacity-70" : "hover:border-primary/30",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated ring-1 ring-transparent transition-shadow",
          s.text,
          `group-hover:${s.ring}`,
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-display text-[14px] font-semibold text-foreground">
            {agent.name}
          </p>
          <AgentStatusDot state={agent.state} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{agent.role}</p>
        <p className={cn("mt-2 font-mono text-[10px] uppercase tracking-[0.16em]", s.text)}>
          {STATE_STYLES[agent.state].label}
        </p>
      </div>
    </motion.div>
  );
}

export function AgentGrid({ agents = DEFAULT_AGENTS }: { agents?: Agent[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((a, i) => (
        <AgentCard key={a.name} agent={a} index={i} />
      ))}
    </div>
  );
}
