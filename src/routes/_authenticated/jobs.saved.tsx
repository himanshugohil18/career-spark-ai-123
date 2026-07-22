import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, ExternalLink, Wand2, Search, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ai/skeleton";
import { listSavedJobs, unsaveJob, updateSavedJob } from "@/lib/jobs.functions";
import { openWorkspace } from "@/lib/workspace.functions";
import { openExternal } from "@/lib/open-external";

const TABS = [
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
  const [tab, setTab] = useState<TabKey>("saved");
  const [q, setQ] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["saved-jobs", tab],
    queryFn: () => listSavedJobs({ data: { status: tab } }),
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-10">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Saved</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Your job library</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every job you bookmarked, sortable and searchable. Turn any saved role into an application workspace with one click.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm ${
              tab === t.key
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, company, location, notes…" className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} />
          Remote only
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-md border border-border bg-elevated px-2 text-sm"
        >
          <option value="recent">Recently saved</option>
          <option value="title">Title A→Z</option>
          <option value="company">Company A→Z</option>
        </select>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {filtered.length} of {(data ?? []).length}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          {(data ?? []).length === 0
            ? "Nothing here yet. Save jobs from the Jobs page and they'll appear here."
            : "No saved jobs match your filters."}
        </div>
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
    </div>
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
    <li className="surface-card flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            to="/jobs/$jobId"
            params={{ jobId: job.id }}
            className="font-display text-base font-semibold hover:text-primary"
          >
            {job.title}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {job.company?.name ?? "—"} · {job.location ?? "—"}{job.remote_status ? ` · ${job.remote_status}` : ""}
          </p>
          {!editing && row.notes && (
            <p className="mt-1 line-clamp-2 text-xs text-foreground/80">{row.notes}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => onPrepare(job.id)} disabled={preparing}>
            <Wand2 className="h-4 w-4" /> Prepare
          </Button>
          <Link
            to="/jobs/$jobId"
            params={{ jobId: job.id }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-elevated px-3 text-xs hover:border-primary/40"
          >
            Open
          </Link>
          {job.application_url && (
            <button
              type="button"
              onClick={() => openExternal(job.application_url)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-elevated px-3 text-xs hover:border-primary/40"
            >
              Apply <ExternalLink className="h-3 w-3" />
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRemove(job.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {editing && (
        <div className="grid gap-3 rounded-lg border border-border bg-elevated/40 p-3 md:grid-cols-[160px_1fr_auto]">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
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
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
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
