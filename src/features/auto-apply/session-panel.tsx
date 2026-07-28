import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bot,
  Check,
  Clock,
  ImageIcon,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ai/skeleton";
import { AUTO_APPLY_STEPS, STEP_LABELS } from "@/lib/auto-apply/driver";
import {
  approveAndSubmit,
  cancelAutoApply,
  getAutoApplySession,
  provideFieldValue,
} from "@/lib/auto-apply.functions";

const STATUS_TONE: Record<string, string> = {
  running: "text-primary",
  awaiting_approval: "text-amber-400",
  awaiting_input: "text-amber-400",
  submitting: "text-primary",
  completed: "text-emerald-400",
  failed: "text-red-400",
  cancelled: "text-muted-foreground",
  queued: "text-muted-foreground",
};

export function AutoApplySessionPanel({ sessionId }: { sessionId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["auto-apply", sessionId],
    queryFn: () => getAutoApplySession({ data: { sessionId } }),
    refetchInterval: 4000,
  });

  // Realtime — refresh whenever an event or the session row changes.
  useEffect(() => {
    const ch = supabase
      .channel(`aas-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_session_events", filter: `session_id=eq.${sessionId}` },
        () => qc.invalidateQueries({ queryKey: ["auto-apply", sessionId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_application_sessions", filter: `id=eq.${sessionId}` },
        () => qc.invalidateQueries({ queryKey: ["auto-apply", sessionId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [sessionId, qc]);

  const approve = useMutation({
    mutationFn: () => approveAndSubmit({ data: { sessionId } }),
    onSuccess: () => {
      toast.success("Approved. Submitting.");
      qc.invalidateQueries({ queryKey: ["auto-apply", sessionId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Approval failed"),
  });

  const cancel = useMutation({
    mutationFn: () => cancelAutoApply({ data: { sessionId } }),
    onSuccess: () => {
      toast.success("Session cancelled.");
      qc.invalidateQueries({ queryKey: ["auto-apply", sessionId] });
    },
  });

  if (isLoading || !data?.session) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  const s = data.session as Record<string, unknown>;
  const status = String(s.status);
  const step = String(s.current_step);
  const progress = Number(s.progress ?? 0);
  const needsInput = data.fields.filter((f) => (f as Record<string, unknown>).needs_user).length > 0;
  const awaitingApproval = status === "awaiting_approval";
  const terminal = ["completed", "failed", "cancelled"].includes(status);
  const elapsed = useElapsed(s.started_at as string | null, s.finished_at as string | null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-primary/40 bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              AI Application Agent
            </p>
            <h3 className="font-display text-lg font-semibold">
              {STEP_LABELS[step] ?? step}
            </h3>
          </div>
          <span className={`font-mono text-xs uppercase tracking-widest ${STATUS_TONE[status] ?? ""}`}>
            {status.replace(/_/g, " ")}
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>{progress}%</span>
          <span>·</span>
          <Clock className="h-3 w-3" /> {elapsed}
          {s.browser_session_id ? (
            <>
              <span>·</span>
              <span>browser {String(s.browser_session_id).slice(0, 10)}…</span>
            </>
          ) : null}
        </div>

        {/* Approval gate */}
        {awaitingApproval && (
          <div className="mt-5 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-amber-300">
              <ShieldCheck className="h-4 w-4" />
              <p className="font-display font-semibold">Final review required</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              The agent has filled the application and is waiting for you. Review the answers and
              screenshots below, then approve to submit — or cancel to stop.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
                {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Approve &amp; submit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Session failed
            </div>
            <p className="mt-1 text-xs">{String(s.error ?? "See timeline for details.")}</p>
          </div>
        )}

        {!terminal && !awaitingApproval && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              <X className="h-4 w-4" /> Stop agent
            </Button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <Timeline currentStep={step} status={status} />

      {/* Missing fields */}
      {needsInput && (
        <FieldsPanel sessionId={sessionId} fields={data.fields as Record<string, unknown>[]} />
      )}

      {/* Answers */}
      {data.answers.length > 0 && (
        <AnswersPanel answers={data.answers as Record<string, unknown>[]} />
      )}

      {/* Screenshots */}
      {data.screenshots.length > 0 && (
        <ScreenshotsPanel shots={data.screenshots as Record<string, unknown>[]} />
      )}

      {/* Log */}
      <LogPanel events={data.events as Record<string, unknown>[]} />
    </div>
  );
}

function Timeline({ currentStep, status }: { currentStep: string; status: string }) {
  const idx = (AUTO_APPLY_STEPS as readonly string[]).indexOf(currentStep);
  return (
    <div className="surface-card p-5">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Timeline</p>
      <ol className="grid gap-2 md:grid-cols-2">
        {AUTO_APPLY_STEPS.map((s, i) => {
          const done = i < idx || status === "completed";
          const active = i === idx && !["completed", "failed", "cancelled"].includes(status);
          return (
            <li key={s} className="flex items-center gap-3">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] font-mono ${
                  done
                    ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                    : active
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border bg-elevated text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={active ? "font-semibold" : ""}>{STEP_LABELS[s] ?? s}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FieldsPanel({ sessionId, fields }: { sessionId: string; fields: Record<string, unknown>[] }) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: (v: { fieldId: string; value: string }) => provideFieldValue({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auto-apply", sessionId] }),
  });
  const needed = fields.filter((f) => f.needs_user);
  if (!needed.length) return null;
  return (
    <div className="surface-card border-amber-400/40 p-5">
      <div className="mb-3 flex items-center gap-2 text-amber-300">
        <AlertTriangle className="h-4 w-4" />
        <p className="font-display font-semibold">Agent needs your input</p>
      </div>
      <ul className="space-y-2">
        {needed.map((f) => (
          <li key={String(f.id)} className="flex flex-wrap items-center gap-2">
            <span className="min-w-[140px] text-sm">{String(f.label)}</span>
            <Input
              placeholder={String(f.note ?? f.label)}
              value={drafts[String(f.id)] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [String(f.id)]: e.target.value }))}
              className="max-w-md"
            />
            <Button
              size="sm"
              variant="ghost"
              disabled={!drafts[String(f.id)] || save.isPending}
              onClick={() => save.mutate({ fieldId: String(f.id), value: drafts[String(f.id)]! })}
            >
              Save
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnswersPanel({ answers }: { answers: Record<string, unknown>[] }) {
  return (
    <div className="surface-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <p className="font-display font-semibold">Draft answers</p>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {answers.length} questions
        </span>
      </div>
      <div className="space-y-4">
        {answers.map((a) => (
          <div key={String(a.id)} className="rounded-xl border border-border bg-elevated/40 p-3">
            <p className="text-sm font-medium">{String(a.question)}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{String(a.answer)}</p>
            {a.confidence != null && (
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                confidence {Math.round(Number(a.confidence) * 100)}%
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenshotsPanel({ shots }: { shots: Record<string, unknown>[] }) {
  return (
    <div className="surface-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-primary" />
        <p className="font-display font-semibold">Browser screenshots</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {shots.map((s) => (
          <a
            key={String(s.id)}
            href={String(s.image_url)}
            target="_blank"
            rel="noreferrer"
            className="group block overflow-hidden rounded-xl border border-border bg-elevated"
          >
            <img
              src={String(s.image_url)}
              alt={String(s.caption ?? s.step ?? "screenshot")}
              className="aspect-video w-full object-cover transition group-hover:opacity-90"
              loading="lazy"
            />
            <p className="border-t border-border p-2 text-xs text-muted-foreground">
              {String(s.step ?? "")}{s.caption ? ` · ${String(s.caption)}` : ""}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function LogPanel({ events }: { events: Record<string, unknown>[] }) {
  const rows = useMemo(() => [...events].reverse().slice(0, 200), [events]);
  return (
    <div className="surface-card p-5">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Activity log ({events.length})
      </p>
      <ol className="space-y-1 font-mono text-[11px]">
        {rows.map((e) => {
          const kind = String(e.kind ?? "info");
          const color =
            kind === "error"
              ? "text-red-300"
              : kind === "warning"
                ? "text-amber-300"
                : kind === "approval"
                  ? "text-primary"
                  : "text-muted-foreground";
          return (
            <li key={String(e.id)} className={`flex gap-3 ${color}`}>
              <span className="opacity-60">
                {new Date(String(e.created_at)).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span className="uppercase opacity-60">{String(e.step ?? "")}</span>
              <span className="flex-1 text-foreground/90">{String(e.message)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function useElapsed(startedAt: string | null, finishedAt: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (finishedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [finishedAt]);
  if (!startedAt) return "not started";
  const end = finishedAt ? new Date(finishedAt).getTime() : now;
  const secs = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
