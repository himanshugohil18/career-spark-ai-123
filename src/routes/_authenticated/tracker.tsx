import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, ExternalLink, KanbanSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ai/skeleton";
import {
  listTrackedApplications,
  removeTrackedApplication,
  updateTrackedApplication,
} from "@/lib/tracker.functions";

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
  { id: "saved", label: "Saved" },
  { id: "preparing", label: "Preparing" },
  { id: "applied", label: "Applied" },
  { id: "assessment", label: "Assessment" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
  { id: "closed", label: "Closed" },
] as const;

type Stage = (typeof STAGES)[number]["id"];

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

  const activeCount = rows.filter(
    (r) => !["rejected", "closed"].includes(r.status),
  ).length;
  const interviews = rows.filter((r) => r.status === "interview").length;
  const offers = rows.filter((r) => r.status === "offer").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Application tracker</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} tracked · {activeCount} active · {interviews} in interview · {offers} offer
          {offers === 1 ? "" : "s"}
        </p>
      </header>

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <KanbanSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Nothing tracked yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Save a job and it lands here automatically.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/jobs">Browse jobs</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-flow-col lg:auto-cols-[minmax(17rem,1fr)]">
          {STAGES.map((stage) => {
            const items = grouped.get(stage.id) ?? [];
            return (
              <section key={stage.id} className="min-w-[17rem] space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{stage.label}</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {items.map((row) => (
                    <li key={row.id} className="rounded-xl border border-border bg-card/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to="/jobs/$jobId"
                            params={{ jobId: row.jobId }}
                            className="block truncate text-sm font-medium hover:underline"
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
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Open original posting"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>

                      {!row.jobActive ? (
                        <p className="mt-2 text-[11px] text-destructive">
                          Posting is no longer live
                        </p>
                      ) : null}

                      <div className="mt-2 space-y-2">
                        <select
                          className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
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
                          <CalendarClock className="h-3.5 w-3.5" />
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
                            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
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
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => remove.mutate(row.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {row.notes && openNotes !== row.id ? (
                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[11px] text-muted-foreground">
                          {row.notes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                  {items.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-border/70 p-3 text-center text-[11px] text-muted-foreground">
                      Empty
                    </li>
                  ) : null}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
