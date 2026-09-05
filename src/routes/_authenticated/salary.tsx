import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Banknote, MapPin, Plane, Laptop } from "lucide-react";
import { Skeleton } from "@/components/ai/skeleton";
import { PageHeader } from "@/components/product/page-header";
import { getSalaryInsights } from "@/lib/salary.functions";
import { formatInr } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/salary")({
  head: () => ({ meta: [{ title: "Salary & Market · CareerOS" }] }),
  component: SalaryPage,
});

function fmt(n: number | null, _currency?: string) {
  return formatInr(n) ?? "—";
}

function SalaryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["salary-insights"],
    queryFn: () => getSalaryInsights(),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <PageHeader
        eyebrow="Market intelligence"
        title="Salary, location & visa analytics"
        description="Computed live from active job postings in the CareerOS dataset — not scraped salary surveys."
        meta={
          data?.role ? (
            <span className="text-xs text-muted-foreground">
              Benchmark role · <span className="text-foreground">{data.role}</span>
              {!data.matchedOnRole && " · using full market (few role-specific postings)"}
            </span>
          ) : undefined
        }
      />

      {isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "25th percentile", value: fmt(data.bands.p25, data.currency) },
              { label: "Median (max)", value: fmt(data.bands.median, data.currency) },
              { label: "75th percentile", value: fmt(data.bands.p75, data.currency) },
              { label: "90th percentile", value: fmt(data.bands.p90, data.currency) },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="surface-card p-5"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Banknote className="h-3.5 w-3.5" /> {c.label}
                </div>
                <p className="mt-2 text-xl font-semibold text-foreground">{c.value}</p>
              </motion.div>
            ))}
          </div>

          {data.positioning && (
            <section className="surface-card p-6">
              <h2 className="section-title">Your expectation vs the market</h2>
              <p className="mt-3 text-sm text-foreground">
                You expect <span className="font-semibold">{fmt(data.positioning.expected, data.currency)}</span> — that
                sits at the <span className="font-semibold">{data.positioning.percentileOfMarket}th percentile</span> of
                current postings.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{data.positioning.verdict}</p>
            </section>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <section className="surface-card p-6">
              <div className="flex items-center gap-2">
                <Laptop className="h-4 w-4 text-primary" />
                <h2 className="section-title">Remote split</h2>
              </div>
              <p className="mt-3 text-2xl font-semibold text-foreground">{data.remote.remotePct}% remote</p>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                <div className="bg-primary" style={{ width: `${(data.remote.remote / Math.max(1, data.sampleSize)) * 100}%` }} />
                <div className="bg-primary/50" style={{ width: `${(data.remote.hybrid / Math.max(1, data.sampleSize)) * 100}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Remote {data.remote.remote}</span>
                <span>Hybrid {data.remote.hybrid}</span>
                <span>Onsite {data.remote.onsite}</span>
              </div>
            </section>

            <section className="surface-card p-6">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                <h2 className="section-title">Visa & relocation</h2>
              </div>
              <p className="mt-3 text-2xl font-semibold text-foreground">{data.visa.sponsorshipPct}%</p>
              <p className="text-xs text-muted-foreground">
                of {data.sampleSize} postings mention visa sponsorship ({data.visa.sponsorshipCount} jobs)
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.visa.relocationCount} postings offer explicit relocation assistance.
              </p>
            </section>

            <section className="surface-card p-6">
              <h2 className="section-title">Pay by seniority</h2>
              <ul className="mt-3 space-y-2">
                {data.byLevel.length === 0 && (
                  <li className="text-xs text-muted-foreground">No seniority data in current postings.</li>
                )}
                {data.byLevel.map((l) => (
                  <li key={l.level} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{l.level}</span>
                    <span className="font-medium text-foreground">{fmt(l.avgMax, data.currency)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="surface-card p-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="section-title">Top hiring locations</h2>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Location</th>
                    <th className="pb-2 pr-4 font-medium">Open roles</th>
                    <th className="pb-2 font-medium">Avg max salary</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topLocations.map((loc) => (
                    <tr key={loc.location} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-4 text-foreground">{loc.location}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{loc.count}</td>
                      <td className="py-2.5 font-medium text-foreground">{fmt(loc.avgMax, data.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
