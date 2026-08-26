import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bookmark,
  Briefcase,
  Check,
  ExternalLink,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ai/skeleton";
import { listSavedJobs, unsaveJob, updateSavedJob } from "@/lib/jobs.functions";
import { openWorkspace } from "@/lib/workspace.functions";
import { openExternal } from "@/lib/open-external";
import { PageHeader, PageShell } from "@/components/product/page-header";
import { EmptyState } from "@/components/product/empty-state";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "all", label: "All" },
  { key: "saved", label: "Saved" },
  { key: "favorite", label: "Favorites" },
  { key: "applied_later", label: "Apply later" },
  { key: "archived", label: "Archived" },
  { key: "ignored", label: "Ignored" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
type SortKey = "recent" | "title" | "company";

export const Route = createFileRoute("/_authenticated/jobs/saved")({
  head: () => ({ meta: [{ title: "Saved jobs · CareerOS" }] }),
  component: SavedJobs,
});

function SavedJobs() {
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["saved-jobs", tab],
    queryFn: () => listSavedJobs({ data: tab === "all" ? {} : { status: tab } }),
  });

  const remove = useMutation({
    mutationFn: (jobId: string) => unsaveJob({ data: { jobId } }),
    onSuccess: () => {
      toast.success("Removed.");
      void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
  });

  const prepare = useMutation({
    mutationFn: (jobId: string) => openWorkspace({ data: { jobId } }),
    onSuccess: ({ workspaceId }) => {
      toast.success("Workspace ready.");
      navigate({ to: "/applications/$workspaceId", params: { workspaceId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const rows = (data ?? []) as any[];
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (!r.job) return false;
      if (remoteOnly && r.job.remote_status !== "remote") return false;
      if (!needle) return true;
      const hay = [r.job.title, r.job.company?.name, r.job.location, r.notes ?? ""].join(" ").toLowerCase();
      return hay.includes(needle);
    });
    out = out.sort((a, b) => {
      if (sort === "title") return (a.job?.title ?? "").localeCompare(b.job?.title ?? "");
      if (sort === "company") return (a.job?.company?.name ?? "").localeCompare(b.job?.company?.name ?? "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return out;
  }, [data, q, remoteOnly, sort]);

  const total = (data ?? []).length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Job library"
        title="Saved jobs"
        description="Every role you bookmarked — searchable, sortable, and one click away from an AI-prepared application."
        meta={
          total > 0 ? (
            <span className="stage-chip">
              <Bookmark className="h-3.5 w-3.5 text-primary" />
              {total} {total === 1 ? "role" : "roles"} in your library
            </span>
          ) : undefined
        }
        actions={
          <Button variant="primary" asChild>
            <Link to="/jobs">
              <Briefcase className="h-4 w-4" /> Discover jobs
            </Link>
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, company, location, notes…" className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} className="accent-primary" />
          Remote only
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        >
          <option value="recent">Recently saved</option>
          <option value="title">Title A→Z</option>
          <option value="company">Company A→Z</option>
        </select>
        <span className="meta-text ml-auto">
          Showing {filtered.length} of {total}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        total === 0 ? (
          <EmptyState
            icon={Bookmark}
            eyebrow="Nothing saved yet"
            title="Build your job library"
            body="Save roles from the discovery feed and CareerOS will track them here — ready to turn into AI-prepared applications whenever you are."
            action={{ label: "Explore matches", to: "/jobs" }}
            secondaryAction={{ label: "Ask the assistant", to: "/chat" }}
            tips={[
              { icon: Sparkles, label: "See high-match roles", to: "/jobs" },
              { icon: Briefcase, label: "Browse collections", to: "/jobs/collections" },
            ]}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No saved jobs match your filters"
            body="Try a different search term, clear the remote-only filter, or switch tabs."
            action={{ label: "Clear search", onClick: () => { setQ(""); setRemoteOnly(false); } }}
            compact
          />
        )
      ) : (
        <ul className="space-y-3">
          {filtered.map((row: any) => (
            <SavedRow
              key={row.id}
              row={row}
              onPrepare={(id) => prepare.mutate(id)}
              onRemove={(id) => remove.mutate(id)}
              preparing={prepare.isPending}
            />
          ))}
        </ul>
      )}

      {/* Low-content nudge: library exists but is small */}
      {!isLoading && filtered.length > 0 && total <= 2 && (
        <div className="surface-highlight flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Your library is just getting started</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                CareerOS refreshes matches daily — save a few more roles so your agent always has something ready.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/jobs">Find more matches</Link>
          </Button>
        </div>
      )}
    </PageShell>
  );
}

const STATUS_OPTIONS: { value: "saved" | "favorite" | "applied_later" | "archived" | "ignored"; label: string }[] = [
  { value: "saved", label: "Saved" },
  { value: "favorite", label: "Favorite" },
  { value: "applied_later", label: "Apply later" },
  { value: "archived", label: "Archived" },
  { value: "ignored", label: "Ignored" },
];

function SavedRow({
  row,
  onPrepare,
  onRemove,
  preparing,
}: {
  row: any;
  onPrepare: (jobId: string) => void;
  onRemove: (jobId: string) => void;
  preparing: boolean;
}) {
  const job = row.job as {
    id: string;
    title: string;
    location: string | null;
    remote_status: string | null;
    application_url: string | null;
    company?: { name?: string; logo_url?: string | null } | null;
  } | null;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState<string>(row.notes ?? "");
  const [status, setStatus] = useState<string>(row.status ?? "saved");

  const save = useMutation({
    mutationFn: () =>
      updateSavedJob({
        data: {
          jobId: job!.id,
          notes: notes.trim() ? notes.trim() : null,
          status: status as "saved" | "favorite" | "applied_later" | "archived" | "ignored",
        },
      }),
    onSuccess: () => {
      toast.success("Saved.");
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!job) return null;

  return (
    <li className="surface-card p-4 transition-shadow hover:shadow-card md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground">
            {job.company?.logo_url ? (
              <img src={job.company.logo_url} alt={job.company?.name ?? "Company"} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <Briefcase className="h-4.5 w-4.5" />
            )}
          </div>
          <div className="min-w-0">
            <Link
              to="/jobs/$jobId"
              params={{ jobId: job.id }}
              className="block truncate text-[15px] font-semibold hover:text-primary"
            >
              {job.title}
            </Link>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {job.company?.name ?? "—"} · {job.location ?? "—"}{job.remote_status ? ` · ${job.remote_status}` : ""}
            </p>
            {!editing && row.notes && (
              <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground">“{row.notes}”</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => onPrepare(job.id)} disabled={preparing}>
            <Wand2 className="h-4 w-4" /> Prepare
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/jobs/$jobId" params={{ jobId: job.id }}>Open</Link>
          </Button>
          {job.application_url && (
            <Button variant="outline" size="sm" onClick={() => openExternal(job.application_url)}>
              Apply <ExternalLink className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)} aria-label="Edit notes">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRemove(job.id)} aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {editing && (
        <div className="mt-3 grid gap-3 rounded-xl border border-border bg-muted/50 p-3 md:grid-cols-[160px_minmax(0,1fr)_auto]">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes — why this role, referrals, contacts, follow-up dates…"
            rows={2}
            className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex items-start gap-2">
            <Button variant="primary" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              <Check className="h-4 w-4" /> Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setNotes(row.notes ?? ""); setStatus(row.status ?? "saved"); setEditing(false); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
