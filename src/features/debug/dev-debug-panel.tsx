/**
 * DEV-only pipeline health panel. Shows Career Brain, Resume, provider,
 * discovery, and matching status. Never renders in production builds.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bug, ChevronDown, ChevronUp } from "lucide-react";
import { getPipelineDebug } from "@/lib/jobs.functions";
import { getCareerBrainSnapshot } from "@/lib/career-brain.service";

export function DevDebugPanel() {
  const [open, setOpen] = useState(false);
  const brain = useQuery({
    queryKey: ["debug-brain"],
    queryFn: () => getCareerBrainSnapshot(),
    staleTime: 30_000,
    enabled: open,
  });
  const debug = useQuery({
    queryKey: ["debug-pipeline"],
    queryFn: () => getPipelineDebug(),
    staleTime: 15_000,
    enabled: open,
    refetchInterval: open ? 10_000 : false,
  });

  if (!import.meta.env.DEV) return null;

  const rows: Array<[string, string]> = [];
  if (brain.data) {
    rows.push(
      ["Current User ID", brain.data.userId ?? "—"],
      ["Career Brain User ID", debug.data?.userId ?? "—"],
      ["Career Brain Status", brain.data.ready ? "ACTIVE" : "MISSING"],
      ["Career Brain Version", brain.data.metadata.brainVersion ? `v${brain.data.metadata.brainVersion}` : "—"],
      ["Resume", brain.data.metadata.resumeName ?? "—"],
      ["Resume Version", brain.data.metadata.resumeVersion ? `v${brain.data.metadata.resumeVersion}` : "—"],
      ["Career Health", brain.data.health ? `${(brain.data.health as { score?: number }).score ?? "—"}/100` : "MISSING"],
      ["Career DNA", brain.data.dna ? "OK" : "MISSING"],
      ["AI Model", brain.data.metadata.aiModel ?? "—"],
      ["Overall Confidence", brain.data.metadata.overallConfidence != null ? `${Math.round(Number(brain.data.metadata.overallConfidence) * 100)}%` : "—"],
    );
  }
  if (debug.data) {
    const providers = debug.data.sources
      .filter((s: { enabled: boolean }) => s.enabled)
      .map((s: { id: string; last_error: string | null }) => `${s.id}${s.last_error ? "⚠" : ""}`)
      .join(", ") || "none";
    const errors = debug.data.sources
      .filter((s: { last_error: string | null }) => s.last_error)
      .map((s: { id: string; last_error: string | null }) => `${s.id}: ${s.last_error}`)
      .join(" | ") || "none";
    const lastDiscovery = debug.data.sources
      .map((s: { last_run_at: string | null }) => s.last_run_at)
      .filter(Boolean)
      .sort()
      .pop();
    rows.push(
      ["Providers Enabled", providers],
      ["Jobs in Database", String(debug.data.jobsCount)],
      ["Companies", String(debug.data.companiesCount)],
      ["Job Matches", String(debug.data.matchesCount)],
      ["Average Match Score", debug.data.averageMatchScore ? `${debug.data.averageMatchScore}%` : "—"],
      ["Last Discovery", lastDiscovery ? new Date(lastDiscovery as string).toLocaleString() : "never"],
      ["Last Match", debug.data.lastMatchAt ? new Date(debug.data.lastMatchAt).toLocaleString() : "never"],
      ["Provider Errors", errors],
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-md rounded-lg border border-warning/40 bg-background/95 font-mono text-[11px] shadow-lg backdrop-blur">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-warning"
      >
        <span className="flex items-center gap-2">
          <Bug className="h-3.5 w-3.5" /> DEV Pipeline Debug
        </span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-3">
          {brain.isLoading || debug.isLoading ? (
            <p className="text-muted-foreground">Loading pipeline snapshot…</p>
          ) : (
            <>
              <table className="w-full">
                <tbody>
                  {rows.map(([k, v]) => (
                    <tr key={k} className="border-b border-border/40 last:border-0">
                      <td className="py-1 pr-3 text-muted-foreground">{k}</td>
                      <td className="py-1 text-foreground break-all">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {debug.data?.candidateProfile && (
                <section className="rounded-md border border-primary/30 bg-primary/5 p-2">
                  <p className="text-primary mb-1">🧠 Candidate Profile (Career Brain → Discovery)</p>
                  {!debug.data.candidateProfile.ready ? (
                    <p className="text-muted-foreground">Brain not ready — approve a resume to activate.</p>
                  ) : (
                    <table className="w-full">
                      <tbody>
                        <tr><td className="py-0.5 pr-2 text-muted-foreground">Primary</td><td className="py-0.5">{debug.data.candidateProfile.primary ?? "—"} <span className="text-muted-foreground">({debug.data.candidateProfile.domain ?? "—"})</span></td></tr>
                        <tr><td className="py-0.5 pr-2 text-muted-foreground">Families</td><td className="py-0.5 break-all">{(debug.data.candidateProfile.families ?? []).join(", ") || "—"}</td></tr>
                        <tr><td className="py-0.5 pr-2 text-muted-foreground">Excluded</td><td className="py-0.5 break-all text-destructive">{(debug.data.candidateProfile.excluded ?? []).slice(0, 10).join(", ") || "—"}</td></tr>
                        <tr><td className="py-0.5 pr-2 text-muted-foreground">Seniority</td><td className="py-0.5">{debug.data.candidateProfile.seniority ?? "—"}{debug.data.candidateProfile.yearsOfExperience != null ? ` · ${debug.data.candidateProfile.yearsOfExperience}y` : ""}</td></tr>
                        <tr><td className="py-0.5 pr-2 text-muted-foreground">Locations</td><td className="py-0.5 break-all">{(debug.data.candidateProfile.locations ?? []).join(", ") || "—"} <span className="text-muted-foreground">({debug.data.candidateProfile.remotePreference ?? "—"})</span></td></tr>
                        <tr><td className="py-0.5 pr-2 text-muted-foreground align-top">Tech</td><td className="py-0.5 break-all">{(debug.data.candidateProfile.techStack ?? []).join(", ") || "—"}</td></tr>
                      </tbody>
                    </table>
                  )}
                </section>
              )}

              {debug.data?.candidateProfile?.queries?.length ? (
                <section className="rounded-md border border-accent/30 bg-accent/5 p-2">
                  <p className="text-accent mb-1">🔍 Discovery Queries ({debug.data.candidateProfile.queries.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {debug.data.candidateProfile.queries.map((q: string) => (
                      <span key={q} className="rounded border border-accent/30 bg-background px-1.5 py-0.5 text-[10px]">
                        {q}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Providers that accept a query use these directly; every discovered job is
                    filtered against family-fit AND query-substring — off-track and excluded-domain
                    roles are dropped BEFORE ranking.
                  </p>
                </section>
              ) : null}

              {debug.data?.discoveryStats?.length ? (
                <section className="rounded-md border border-border bg-elevated/40 p-2">
                  <p className="text-foreground mb-1">📡 Providers Queried / Jobs Removed</p>
                  <div className="space-y-2">
                    {debug.data.discoveryStats
                      .filter((s: { enabled: boolean }) => s.enabled)
                      .map((s: { provider: string; lastDiscovery?: { fetched?: number; kept?: number; droppedExcluded?: number; droppedOffTrack?: number; removed?: Array<{ title: string; company: string; reason: string }> } | null }) => (
                        <div key={s.provider} className="border-b border-border/40 pb-1 last:border-0">
                          <p className="text-[10px] uppercase text-muted-foreground">
                            {s.provider} · returned {s.lastDiscovery?.fetched ?? 0} · kept {s.lastDiscovery?.kept ?? 0} · removed {(s.lastDiscovery?.droppedExcluded ?? 0) + (s.lastDiscovery?.droppedOffTrack ?? 0)}
                          </p>
                          {(s.lastDiscovery?.removed ?? []).slice(0, 3).map((r) => (
                            <p key={`${s.provider}-${r.title}-${r.reason}`} className="truncate text-[10px] text-destructive">
                              − {r.title} · {r.company}: {r.reason}
                            </p>
                          ))}
                        </div>
                      ))}
                  </div>
                </section>
              ) : null}

              {debug.data?.rankedJobs?.length ? (
                <section className="rounded-md border border-primary/30 bg-primary/5 p-2">
                  <p className="text-primary mb-1">🏁 Final Jobs Ranked</p>
                  <div className="space-y-1">
                    {debug.data.rankedJobs.map((j: { title: string; company: string; provider: string; score: number; domainConfidence: number; reason: string; kept: boolean }) => (
                      <p key={`${j.provider}-${j.title}-${j.company}`} className={j.kept ? "text-[10px] text-foreground" : "text-[10px] text-destructive"}>
                        {j.score}% · {j.domainConfidence}% domain · {j.title} · {j.company} <span className="text-muted-foreground">({j.reason})</span>
                      </p>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
