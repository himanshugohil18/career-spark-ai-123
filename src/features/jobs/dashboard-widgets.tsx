import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Building2, GraduationCap, Sparkles, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardWidgets } from "@/lib/jobs.functions";
import { Skeleton } from "@/components/ai/skeleton";

export function DashboardWidgets() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-widgets"],
    queryFn: () => getDashboardWidgets(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }
  if (!data?.ready) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">AI Signals</p>
          <h3 className="mt-1 font-display text-xl font-semibold">Powered by your matching engine</h3>
        </div>
        <Link to="/jobs" className="text-xs text-primary underline-offset-2 hover:underline">
          Open recommendations →
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.topMatch && (
          <Widget
            icon={Sparkles}
            eyebrow="Top match today"
            title={`${data.topMatch.score}% — ${data.topMatch.title}`}
            body={data.topMatch.companyName ?? "—"}
            href={data.topMatch.jobId ? `/jobs/${data.topMatch.jobId}` : undefined}
            highlight
          />
        )}
        <Widget
          icon={TrendingUp}
          eyebrow="New since yesterday"
          title={`${data.newSinceYesterday} jobs`}
          body={data.newSinceYesterday > 0 ? "Fresh opportunities in your feed." : "No new jobs in the last 24 h."}
          href="/jobs"
        />
        {data.topCompany && (
          <Widget
            icon={Building2}
            eyebrow="Recommended company"
            title={data.topCompany.name}
            body={`${data.topCompany.count} matched roles · top ${Math.round(data.topCompany.topScore)}%`}
            href="/jobs"
          />
        )}
        {data.missingSkill && (
          <Widget
            icon={GraduationCap}
            eyebrow="Missing skill of the week"
            title={data.missingSkill.skill}
            body={`Blocks ${data.missingSkill.jobsAffected} high-match role${data.missingSkill.jobsAffected === 1 ? "" : "s"}.`}
          />
        )}
      </div>
    </section>
  );
}

function Widget({
  icon: Icon,
  eyebrow,
  title,
  body,
  href,
  highlight,
}: {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  body: string;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={
        "surface-card card-interactive flex h-full flex-col justify-between gap-3 p-5 " +
        (highlight ? "border-primary/40 bg-primary/5" : "")
      }
    >
      <div className="flex items-center justify-between">
        <span className="icon-halo">
          <Icon className="h-4 w-4" />
        </span>
        {highlight && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
            <span className="status-dot h-1.5 w-1.5" /> Top
          </span>
        )}
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
        <p className="mt-1 line-clamp-2 font-display text-base font-semibold">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{body}</p>
      </div>
      {href && (
        <a href={href} className="group/link w-fit text-xs text-primary underline-offset-2 hover:underline">
          Open <span className="inline-block transition-transform group-hover/link:translate-x-0.5">→</span>
        </a>
      )}
    </motion.div>
  );
  return inner;
}

