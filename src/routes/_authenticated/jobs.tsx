import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, ChevronDown, RefreshCw, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ai/skeleton";
import { JobCard, type JobCardData } from "@/features/jobs/job-card";
import { JobSection, type JobSectionData } from "@/features/jobs/job-section";
import { JobFiltersPanel, type FeedFilters } from "@/features/jobs/job-filters";
import { NLSearchBar } from "@/features/jobs/nl-search";
import { EmptyFeed } from "@/features/jobs/empty-feed";
import {
  ensureInitialMatches,
  getJobSections,
  kickMatchRefresh,
  listJobs,
  nlSearch,
  saveJob,
  trackJobInteraction,
  unsaveJob,
} from "@/lib/jobs.functions";
import { getCareerBrainSnapshot } from "@/lib/career-brain.service";

const SORT_LABELS: Record<string, string> = {
  match: "Overall Match",
  newest: "Newest",
  salary: "Salary",
  remote: "Remote first",
  updated: "Recently updated",
};

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs · CareerOS" }] }),
  component: JobsFeed,
});

function JobsFeed() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FeedFilters>({});
  const [sort, setSort] = useState<"match" | "newest" | "salary" | "remote" | "updated">("match");
  const [searchOpen, setSearchOpen] = useState(false);

  const brainQuery = useQuery({
    queryKey: ["career-brain"],
    queryFn: () => getCareerBrainSnapshot(),
    staleTime: 60_000,
  });
  const hasBrain = !!brainQuery.data?.ready;

  const feedInput = useMemo(
    () => ({ ...filters, sort, page: 1, pageSize: 20 }),
    [filters, sort],
  );

  const sections = useQuery({
    queryKey: ["job-sections"],
    queryFn: () => getJobSections(),
    staleTime: 60_000,
    enabled: hasBrain,
  });

  const feed = useQuery({
    queryKey: ["jobs-feed", feedInput],
    queryFn: () => listJobs({ data: feedInput }),
    staleTime: 60_000,
    enabled: searchOpen || !!filters.q || !!filters.role,
  });

  // Idempotent bootstrap: personalize sections on first visit.
  useEffect(() => {
    if (!hasBrain) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await ensureInitialMatches();
        if (!cancelled && r.ran) {
          void queryClient.invalidateQueries({ queryKey: ["job-sections"] });
          void queryClient.invalidateQueries({ queryKey: ["jobs-feed"] });
        }
      } catch (err) {
        console.error("[jobs] ensureInitialMatches failed:", err);
      }
    })();
    const onRej = (ev: PromiseRejectionEvent) => console.error("[jobs] unhandledrejection:", ev.reason);
    const onErr = (ev: ErrorEvent) => console.error("[jobs] window error:", ev.error ?? ev.message, ev.filename, ev.lineno);
    window.addEventListener("unhandledrejection", onRej);
    window.addEventListener("error", onErr);
    return () => {
      cancelled = true;
      window.removeEventListener("unhandledrejection", onRej);
      window.removeEventListener("error", onErr);
    };
  }, [hasBrain, queryClient]);

  const nlMutation = useMutation({
    mutationFn: (q: string) => nlSearch({ data: { query: q } }),
    onSuccess: (parsed, query) => {
      const merged: FeedFilters = {
        q: query,
        role: parsed.role ?? query,
        remoteStatus: parsed.remoteStatus as FeedFilters["remoteStatus"],
        employmentType: parsed.employmentType,
        experienceLevel: parsed.experienceLevel,
        location: parsed.location ?? undefined,
        technology: parsed.technology,
        salaryMin: parsed.salaryMin ?? undefined,
        postedWithinDays: parsed.postedWithinDays ?? undefined,
      };
      setFilters(merged);
      setSort("match");
      setSearchOpen(true);
      toast.success("AI ranked roles for your query.");
    },
    onError: (e) => {
      console.error("[jobs] nlSearch failed:", e);
      toast.error(e instanceof Error ? e.message : "Search failed");
    },
  });

  const saveMutation = useMutation({
    mutationFn: (jobId: string) => {
      const current = feed.data?.items.find((i) => i.id === jobId);
      if (current?.savedStatus) return unsaveJob({ data: { jobId } });
      return saveJob({ data: { jobId, status: "saved" } });
    },
    onSuccess: (_r, jobId) => {
      void trackJobInteraction({ data: { jobId, kind: "saved" } }).catch(() => {});
      void queryClient.invalidateQueries({ queryKey: ["jobs-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["job-sections"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
      toast.success("Saved list updated.");
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => kickMatchRefresh(),
    onSuccess: (r) => {
      toast.success(`AI evaluated ${r.evaluated} jobs · ${r.skipped} skipped.`);
      void queryClient.invalidateQueries({ queryKey: ["jobs-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["job-sections"] });
    },
    onError: (e) => {
      console.error("[jobs] refresh matches failed:", e);
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    },
  });

  const onCardClick = (jobId: string) => {
    void trackJobInteraction({ data: { jobId, kind: "clicked" } }).catch(() => {});
  };

  const items = (feed.data?.items ?? []) as unknown as JobCardData[];
  const roleFamily = feed.data?.roleFamily ?? null;
  const activeQuery = feed.data?.query ?? filters.q ?? filters.role ?? null;
  const showSearchResults = searchOpen || !!activeQuery;
  const sectionList = (sections.data?.sections ?? []) as JobSectionData[];
  const suggestedCompanies = sections.data?.companies ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6 md:p-10">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          AI Recommendation Center
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Opportunities matched to your Career Brain
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every role is scored across skills, experience, tech, career goal, salary, and location.
          Ranked live by AI.
        </p>
      </header>

      {/* Command bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchOpen((v) => !v)}
          className="w-full justify-start md:w-auto"
        >
          <Search className="h-4 w-4" />
          {showSearchResults ? "Hide search" : "Search & filter jobs"}
          <ChevronDown className={"h-4 w-4 transition-transform " + (searchOpen ? "rotate-180" : "")} />
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending || !hasBrain}
          >
            <RefreshCw className={refreshMutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh matches
          </Button>
        </div>
      </div>

      {/* Search panel */}
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <NLSearchBar
              onSearch={(q) => nlMutation.mutate(q)}
              loading={nlMutation.isPending}
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Sort
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="rounded-md border border-border bg-elevated px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              >
                {Object.entries(SORT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(activeQuery || roleFamily) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono uppercase tracking-widest text-primary">
                {roleFamily ? `${roleFamily.label} family` : "Search"}
              </span>
              {activeQuery && (
                <span className="text-muted-foreground">Query: “{activeQuery}”</span>
              )}
              <button
                className="ml-auto text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => setFilters({})}
              >
                Clear search
              </button>
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <JobFiltersPanel value={filters} onChange={setFilters} />
            <div className="space-y-4">
              {feed.isLoading ? (
                <>
                  <Skeleton className="h-28 rounded-2xl" />
                  <Skeleton className="h-28 rounded-2xl" />
                </>
              ) : items.length === 0 ? (
                <EmptyFeed
                  hasBrain={hasBrain}
                  onRefresh={() => refreshMutation.mutate()}
                  loading={refreshMutation.isPending}
                  roleLabel={roleFamily?.label ?? (activeQuery ?? null)}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{feed.data?.total ?? items.length} opportunities</span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Sparkles className="h-3 w-3" /> AI-ranked
                    </span>
                  </div>
                  {items.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onSave={(id) => saveMutation.mutate(id)}
                      onClick={onCardClick}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Recommendation sections */}
      {!showSearchResults && (
        <>
          {sections.isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          ) : !hasBrain ? (
            <EmptyFeed
              hasBrain={false}
              onRefresh={() => refreshMutation.mutate()}
              loading={refreshMutation.isPending}
            />
          ) : sectionList.length === 0 ? (
            <EmptyFeed
              hasBrain
              onRefresh={() => refreshMutation.mutate()}
              loading={refreshMutation.isPending}
            />
          ) : (
            <div className="space-y-10">
              {sectionList.map((section) => (
                <JobSection
                  key={section.id}
                  section={section}
                  onSave={(id) => saveMutation.mutate(id)}
                  onClick={onCardClick}
                />
              ))}
              {suggestedCompanies.length > 0 && (
                <section className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-accent" />
                      <h2 className="font-display text-lg font-semibold">Companies You May Like</h2>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Companies with multiple open roles that match your Career Brain.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {suggestedCompanies.map((c) => (
                      <Link
                        key={c.id}
                        to="/jobs"
                        search={{}}
                        className="surface-card flex items-center gap-3 p-4 transition-colors hover:border-primary/30"
                      >
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-border bg-elevated">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 font-display text-sm font-semibold">{c.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {c.matchedCount} matched roles · top match {Math.round(c.topScore)}%
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
