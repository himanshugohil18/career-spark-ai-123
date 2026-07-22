import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bot, Clock, AlertTriangle, CheckCircle2, Loader2, PauseCircle } from "lucide-react";
import { Skeleton } from "@/components/ai/skeleton";
import { getAgentDashboard } from "@/lib/auto-apply.functions";

export function AgentWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["agent-dashboard"],
    queryFn: () => getAgentDashboard(),
    refetchInterval: 8000,
  });

  if (isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  const d = data!;

  const stats = [
    { label: "Running", value: d.running, icon: Loader2, tone: "text-primary" },
    { label: "Queued", value: d.queued, icon: Clock, tone: "text-muted-foreground" },
    { label: "Awaiting you", value: d.awaiting, icon: PauseCircle, tone: "text-amber-400" },
    { label: "Done today", value: d.completedToday, icon: CheckCircle2, tone: "text-emerald-400" },
    { label: "Failed", value: d.failed, icon: AlertTriangle, tone: "text-red-400" },
  ];

  return (
    <Link to="/agent" className="surface-card block p-5 transition hover:border-primary/40">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full border border-primary/40 bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            AI Application Agent
          </p>
          <h3 className="font-display text-lg font-semibold">Autonomous applications</h3>
        </div>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          avg {d.avgMinutes || "—"} min
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-elevated/40 p-3 text-center">
            <s.icon className={`mx-auto h-4 w-4 ${s.tone}`} />
            <p className="mt-1 font-display text-xl font-semibold">{s.value}</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </Link>
  );
}
