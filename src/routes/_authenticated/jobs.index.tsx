import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, ChevronDown, RefreshCw, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ai/skeleton";
import { JobCard, type JobCardData } from "@/features/jobs/job-card";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { JobSection, type JobSectionData } from "@/features/jobs/job-section";
import { JobFiltersPanel, type FeedFilters } from "@/features/jobs/job-filters";
import { NLSearchBar } from "@/features/jobs/nl-search";
import { EmptyFeed } from "@/features/jobs/empty-feed";
import { FeedPulse, type FeedPulseData } from "@/features/jobs/feed-pulse";
import { CareerSignal } from "@/features/jobs/career-signal";
import { PageHeader, PageShell, SectionHeading } from "@/components/product/page-header";
import {
  ensureInitialMatches,
  getFeedPulse,
  getJobSections,
  crawlCatalog,
  kickMatchRefresh,
  listJobs,
  nlSearch,
  saveJob,
  trackJobInteraction,
  unsaveJob,
} from "@/lib/jobs.functions";
import { getCareerBrainSnapshot } from "@/lib/career-brain.service";
import { cn } from "@/lib/utils";

const SORT_LABELS: Record<string, string> = {
  match: "Overall Match",
  newest: "Newest",
  salary: "Salary",
  remote: "Remote first",
  updated: "Recently updated",
};

export const Route = createFileRoute("/_authenticated/jobs/")({
  head: () => ({ meta: [{ title: "Jobs · CareerOS" }] }),
  component: JobsFeed,
});

function JobsFeed() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FeedFilters>({});
  const [sort, setSort] = useState<"match" | "newest" | "salary" | "remote" | "updated">("match");
  const [searchOpen, setSearchOpen] = useState(false);
  const [stage, setStage] = useState<string | null>(null);

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

  const pulse = useQuery({
    queryKey: ["jobs-feed-pulse"],
    queryFn: () => getFeedPulse(),
    staleTime: 60_000,
  });

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

  const isJobSaved = (jobId: string) => {
    const inFeed = feed.data?.items.find((i) => i.id === jobId) as { savedStatus?: string | null } | undefined;
    if (inFeed) return !!inFeed.savedStatus;
    for (const s of sections.data?.sections ?? []) {
      const hit = (s.items as Array<{ id: string; savedStatus?: string | null }>).find((i) => i.id === jobId);
      if (hit) return !!hit.savedStatus;
    }
    return false;
  };

  const saveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const wasSaved = isJobSaved(jobId);
      if (wasSaved) await unsaveJob({ data: { jobId } });
      else await saveJob({ data: { jobId, status: "saved" } });
      return { wasSaved };
    },
    onSuccess: ({ wasSaved }, jobId) => {
      void trackJobInteraction({ data: { jobId, kind: wasSaved ? "ignored" : "saved" } }).catch(() => {});
      void queryClient.invalidateQueries({ queryKey: ["jobs-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["job-sections"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["job-detail", jobId] });
      if (wasSaved) {
        toast.success("Removed from your saved jobs.");
      } else {
        toast.success("Saved to your job library.", {
          action: { label: "View saved", onClick: () => void navigate({ to: "/jobs/saved" }) },
        });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update saved jobs"),
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      setStage("Preparing your profile…");
      const timers: ReturnType<typeof setTimeout>[] = [
        setTimeout(() => setStage("Calculating matches…"), 900),
        setTimeout(() => setStage("Ranking opportunities…"), 4500),
        setTimeout(() => setStage("Updating recommendations…"), 9000),
      ];
      try {
        return await kickMatchRefresh({ data: { force: true } });
      } finally {
        timers.forEach(clearTimeout);
      }
    },
    onSuccess: async (r) => {
      setStage("Updating recommendations…");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["jobs-feed-pulse"] }),
        queryClient.invalidateQueries({ queryKey: ["jobs-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["job-sections"] }),
      ]);
      setStage(null);
      toast.success(`Completed — ${r.evaluated} jobs rescored with the current algorithm.`);
      // Catalog top-up runs after the user already has corrected matches.
      void crawlCatalog().then((c) => {
        if (c?.inserted) {
          void queryClient.invalidateQueries({ queryKey: ["jobs-feed"] });
          void queryClient.invalidateQueries({ queryKey: ["job-sections"] });
        }
      }).catch(() => {});
    },
    onError: (e) => {
      setStage(null);
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
    <PageShell width="wide">
      <PageHeader
        eyebrow="Job discovery"
        title="Find your next role"
        description="Live opportunities from verified sources, ranked against your Career Brain. Freshness-first: every listing shows when we last verified it."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Search className="h-4 w-4" />
              {showSearchResults ? "Hide search" : "Search & filter"}
              <ChevronDown className={cn("h-4 w-4 transition-transform", searchOpen && "rotate-180")} />
            </Button>
            <Button
              variant="primary"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
            >
              <RefreshCw className={cn("h-4 w-4", refreshMutation.isPending && "animate-spin")} />
              {refreshMutation.isPending ? "Refreshing…" : "Refresh matches"}
            </Button>
          </>
        }
      />

      <FeedPulse
        data={pulse.data as FeedPulseData | undefined}
        loading={pulse.isLoading}
        onRefresh={() => refreshMutation.mutate()}
        refreshing={refreshMutation.isPending}
      />

      {hasBrain && <CareerSignal brain={brainQuery.data} />}

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
              <label className="section-label">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
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
              <span className="stage-chip border-primary/25 bg-accent text-accent-foreground">
                {roleFamily ? `${roleFamily.label} family` : "Search"}
              </span>
              {activeQuery && (
                <span className="text-muted-foreground">Query: “{activeQuery}”</span>
              )}
              <button
                className="ml-auto font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => setFilters({})}
              >
                Clear search
              </button>
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
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
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      <Sparkles className="h-3 w-3" /> AI-ranked
                    </span>
                  </div>
                  <Stagger className="space-y-3">
                    {items.map((job) => (
                      <StaggerItem key={job.id}>
                        <JobCard
                          job={job}
                          onSave={(id) => saveMutation.mutate(id)}
                          onClick={onCardClick}
                        />
                      </StaggerItem>
                    ))}
                  </Stagger>
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
                <section>
                  <SectionHeading
                    title="Companies you may like"
                    description="Companies with multiple open roles that match your Career Brain."
                  />
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {suggestedCompanies.map((c) => (
                      <Link
                        key={c.id}
                        to="/jobs"
                        search={{}}
                        className="surface-card card-interactive flex items-center gap-3 p-4"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-semibold">{c.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
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
    </PageShell>
  );
}
