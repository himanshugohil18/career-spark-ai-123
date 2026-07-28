import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bot, Clock, AlertTriangle, CheckCircle2, Loader2, PauseCircle } from "lucide-react";
import { Skeleton } from "@/components/ai/skeleton";
import { SpringNumber } from "@/components/motion/spring-number";
import { getAgentDashboard } from "@/lib/auto-apply.functions";
import { StatusPill } from "@/features/auto-apply/status-pill";

export function AgentWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["agent-dashboard"],
    queryFn: () => getAgentDashboard(),
    refetchInterval: 8000,
  });

  if (isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  const d = data!;

  const overallStatus = d.running > 0 ? "running" : d.awaiting > 0 ? "awaiting_approval" : d.queued > 0 ? "queued" : "idle";

  const stats = [
    { label: "Running", value: d.running, icon: Loader2, tone: "text-primary" },
    { label: "Queued", value: d.queued, icon: Clock, tone: "text-muted-foreground" },
    { label: "Awaiting you", value: d.awaiting, icon: PauseCircle, tone: "text-amber-500" },
    { label: "Done today", value: d.completedToday, icon: CheckCircle2, tone: "text-emerald-500" },
    { label: "Failed", value: d.failed, icon: AlertTriangle, tone: "text-red-500" },
  ];

  return (
    <Link to="/agent" className="surface-card block p-5 transition hover:border-primary/40">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full border border-primary/40 bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            AI Application Agent
          </p>
          <h3 className="font-display text-lg font-semibold">Autonomous applications</h3>
        </div>
        <StatusPill status={overallStatus} layoutId="agent-widget-status" className="ml-2" />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          avg {d.avgMinutes || "—"} min
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-elevated/40 p-3 text-center">
            <s.icon className={`mx-auto h-4 w-4 ${s.tone}`} />
            <p className="mt-1 font-display text-xl font-semibold">
              <SpringNumber value={s.value} />
            </p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </Link>
  );
}
