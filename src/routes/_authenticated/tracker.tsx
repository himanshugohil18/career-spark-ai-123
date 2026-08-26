import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, ExternalLink, KanbanSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ai/skeleton";
import {
  listTrackedApplications,
  removeTrackedApplication,
  updateTrackedApplication,
} from "@/lib/tracker.functions";
import { PageHeader, PageShell, MetaChip } from "@/components/product/page-header";
import { EmptyState } from "@/components/product/empty-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tracker")({
  head: () => ({
    meta: [
      { title: "Application Tracker · CareerOS" },
      {
        name: "description",
        content:
          "Track every CareerOS application through saved, applied, assessment, interview and offer stages with follow-up reminders.",
      },
      { property: "og:title", content: "Application Tracker · CareerOS" },
      {
        property: "og:description",
        content: "A real pipeline view of every job you saved and applied to in CareerOS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackerPage,
});

const STAGES = [
  { id: "saved", label: "Saved", hint: "Roles you bookmarked" },
  { id: "preparing", label: "Preparing", hint: "Application in progress" },
  { id: "applied", label: "Applied", hint: "Submitted to employer" },
  { id: "assessment", label: "Assessment", hint: "Tests & take-homes" },
  { id: "interview", label: "Interview", hint: "Interview rounds" },
  { id: "offer", label: "Offer", hint: "Offers on the table" },
  { id: "rejected", label: "Rejected", hint: "Closed by employer" },
  { id: "closed", label: "Closed", hint: "No longer pursuing" },
] as const;

type Stage = (typeof STAGES)[number]["id"];

const STAGE_EMPTY_HINTS: Record<Stage, string> = {
  saved: "Save jobs from the discovery feed and they land here.",
  preparing: "Open a saved job and let the AI prepare an application.",
  applied: "Submit an application, then move it here to track it.",
  assessment: "No assessments in progress — they'll show up when employers send them.",
  interview: "No interviews yet. Add your first interview when you're invited.",
  offer: "No offers yet — this is where they'll land when they arrive.",
  rejected: "Nothing here. Rejections you log help your agent recalibrate.",
  closed: "Nothing archived. Close roles you're no longer pursuing.",
};

function TrackerPage() {
  const queryClient = useQueryClient();
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tracked-applications"],
    queryFn: () => listTrackedApplications(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["tracked-applications"] });
    void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
  };

  const update = useMutation({
    mutationFn: (vars: {
      id: string;
      status?: Stage;
      notes?: string | null;
      followUpAt?: string | null;
    }) => updateTrackedApplication({ data: vars }),
    onSuccess: () => {
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeTrackedApplication({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed from tracker.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data ?? [];

  const grouped = useMemo(() => {
    const map = new Map<Stage, typeof rows>();
    for (const stage of STAGES) map.set(stage.id, []);
    for (const row of rows) {
      const key = (STAGES.find((s) => s.id === row.status)?.id ?? "saved") as Stage;
      map.get(key)!.push(row);
    }
    return map;
  }, [rows]);

  const activeCount = rows.filter((r) => !["rejected", "closed"].includes(r.status)).length;
  const interviews = rows.filter((r) => r.status === "interview").length;
  const offers = rows.filter((r) => r.status === "offer").length;
  const followUpsDue = rows.filter(
    (r) => r.followUpAt && new Date(r.followUpAt).getTime() <= Date.now() && !["rejected", "closed"].includes(r.status),
  ).length;

  return (
    <PageShell width="wide" className="p-6 md:p-8">
      <PageHeader
        eyebrow="Pipeline"
        title="Application tracker"
        description="Every application moving through your pipeline — from saved role to signed offer."
        meta={
          rows.length > 0 ? (
            <>
              <MetaChip>{rows.length} tracked</MetaChip>
              <MetaChip tone="brand">{activeCount} active</MetaChip>
              {interviews > 0 && <MetaChip tone="success">{interviews} in interview</MetaChip>}
              {offers > 0 && <MetaChip tone="success">{offers} offer{offers === 1 ? "" : "s"}</MetaChip>}
              {followUpsDue > 0 && <MetaChip tone="warning">{followUpsDue} follow-up{followUpsDue === 1 ? "" : "s"} due</MetaChip>}
            </>
          ) : undefined
        }
        actions={
          <Button variant="primary" asChild>
            <Link to="/jobs">
              <Plus className="h-4 w-4" /> Add from jobs
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          eyebrow="No active applications yet"
          title="Start your pipeline"
          body="Start with one of your saved job matches and let CareerOS prepare your application. Every stage change, follow-up, and note is tracked here automatically."
          action={{ label: "Explore matches", to: "/jobs" }}
          secondaryAction={{ label: "Open saved jobs", to: "/jobs/saved" }}
          tips={[
            { label: "See high-match roles", to: "/jobs" },
            { label: "Prepare with AI", to: "/applications" },
          ]}
        />
      ) : (
        <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-flow-col lg:auto-cols-[minmax(17rem,1fr)]">
          {STAGES.map((stage) => {
            const items = grouped.get(stage.id) ?? [];
            return (
              <section key={stage.id} className="min-w-[17rem]">
                <div className="mb-3 flex items-center justify-between rounded-lg bg-muted/70 px-3 py-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-[13px] font-semibold">{stage.label}</h2>
                    <p className="truncate text-[10px] text-muted-foreground">{stage.hint}</p>
                  </div>
                  <span className={cn(
                    "ml-2 grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-semibold",
                    items.length > 0 ? "bg-primary text-primary-foreground" : "bg-border text-muted-foreground",
                  )}>
                    {items.length}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {items.map((row) => (
                    <li key={row.id} className="surface-card p-3.5 transition-shadow hover:shadow-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to="/jobs/$jobId"
                            params={{ jobId: row.jobId }}
                            className="block truncate text-sm font-semibold hover:text-primary"
                          >
                            {row.jobTitle ?? "Untitled role"}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {[row.companyName, row.location || row.remoteStatus]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        {row.applicationUrl ? (
                          <a
                            href={row.applicationUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                            aria-label="Open original posting"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>

                      {!row.jobActive ? (
                        <p className="mt-2 inline-flex rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
                          Posting no longer live
                        </p>
                      ) : null}

                      <div className="mt-2.5 space-y-2">
                        <select
                          className="h-8 w-full rounded-lg border border-border bg-muted/50 px-2 text-xs outline-none focus:border-primary"
                          value={row.status}
                          onChange={(e) =>
                            update.mutate({ id: row.id, status: e.target.value as Stage })
                          }
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>

                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={row.followUpAt ? row.followUpAt.slice(0, 10) : ""}
                            onChange={(e) =>
                              update.mutate({
                                id: row.id,
                                followUpAt: e.target.value
                                  ? new Date(`${e.target.value}T09:00:00Z`).toISOString()
                                  : null,
                              })
                            }
                          />
                        </label>
                      </div>

                      {openNotes === row.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            rows={3}
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Recruiter name, interview prep, salary discussed…"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                update.mutate({ id: row.id, notes: noteDraft || null });
                                setOpenNotes(null);
                              }}
                            >
                              Save note
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setOpenNotes(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between">
                          <button
                            type="button"
                            className="text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
                            onClick={() => {
                              setOpenNotes(row.id);
                              setNoteDraft(row.notes ?? "");
                            }}
                          >
                            {row.notes ? "Edit note" : "Add note"}
                          </button>
                          <button
                            type="button"
                            aria-label="Remove from tracker"
                            className="text-muted-foreground transition-colors hover:text-danger"
                            onClick={() => remove.mutate(row.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {row.notes && openNotes !== row.id ? (
                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap rounded-lg bg-muted/60 p-2 text-[11px] text-muted-foreground">
                          {row.notes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                  {items.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-[11px] leading-relaxed text-muted-foreground">
                      {STAGE_EMPTY_HINTS[stage.id]}
                    </li>
                  ) : null}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
