/**
 * AI Assistant Panel — Resume Optimizer, Cover Letter, Screening, Interview Prep.
 * Compact tabbed panel mounted inside the Application Workspace page.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, FileText, MessageSquare, MessagesSquare, MicVocal,
  Package, Loader2, CheckCircle2, Wand2, Send, Pencil, Copy, Download, PlayCircle, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AIThinking } from "@/components/ai/ai-thinking";
import {
  getAssistantSnapshot,
  generateResumeVersion,
  setActiveResumeVersion,
  generateCoverLetterFn,
  updateCoverLetter,
  generateStandardScreening,
  answerCustomQuestion,
  updateScreeningAnswer,
  generateInterviewSession,
  listInterviewSessions,
  markQuestionPracticed,
  buildApplicationPackage,
  exportApplicationPackage,
} from "@/lib/workspace-assistant.functions";

type TabId = "resume" | "cover" | "screening" | "interview" | "package";

const TABS: Array<{ id: TabId; label: string; icon: any }> = [
  { id: "resume", label: "Resume Optimizer", icon: FileText },
  { id: "cover", label: "Cover Letter", icon: MessageSquare },
  { id: "screening", label: "Screening Q&A", icon: MessagesSquare },
  { id: "interview", label: "Interview Prep", icon: MicVocal },
  { id: "package", label: "Application Package", icon: Package },
];

const STYLES = ["professional", "executive", "concise", "enthusiastic", "startup", "enterprise"] as const;

type PipelineStep = { key: string; label: string; run: () => Promise<unknown>; done: boolean };

export function AssistantPanel({ workspaceId, analysisReady }: { workspaceId: string; analysisReady?: boolean }) {
  const [tab, setTab] = useState<TabId>("resume");
  const qc = useQueryClient();

  const { data: snap, isLoading } = useQuery({
    queryKey: ["assistant-snapshot", workspaceId],
    queryFn: () => getAssistantSnapshot({ data: { workspaceId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["assistant-snapshot", workspaceId] });

  const pipeline = useAutoPipeline({ workspaceId, snap, analysisReady, onChange: invalidate });

  return (
    <section className="surface-card p-6">
      <header className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            AI Application Assistant
          </p>
        </div>
        <PipelineBadge pipeline={pipeline} />
      </header>

      <PipelineBar pipeline={pipeline} />


      <div className="mb-5 flex flex-wrap gap-1.5 border-b border-border pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all " +
                (active
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground")
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "resume" && (
            <ResumeTab workspaceId={workspaceId} snap={snap} loading={isLoading} onChange={invalidate} />
          )}
          {tab === "cover" && (
            <CoverTab workspaceId={workspaceId} snap={snap} loading={isLoading} onChange={invalidate} />
          )}
          {tab === "screening" && (
            <ScreeningTab workspaceId={workspaceId} snap={snap} loading={isLoading} onChange={invalidate} />
          )}
          {tab === "interview" && (
            <InterviewTab workspaceId={workspaceId} onChange={invalidate} />
          )}
          {tab === "package" && (
            <PackageTab workspaceId={workspaceId} snap={snap} />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

// ---------- Resume Optimizer ----------

function ResumeTab({ workspaceId, snap, loading, onChange }: any) {
  const gen = useMutation({
    mutationFn: () => generateResumeVersion({ data: { workspaceId } }),
    onSuccess: () => { toast.success("Optimized resume ready."); onChange(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const activate = useMutation({
    mutationFn: (versionId: string) => setActiveResumeVersion({ data: { versionId, workspaceId } }),
    onSuccess: () => { toast.success("Version activated."); onChange(); },
  });

  const versions = snap?.versions ?? [];
  const active = versions.find((v: any) => v.is_active) ?? versions[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold">AI Resume Optimizer</h3>
          <p className="text-xs text-muted-foreground">
            Reorders and reworks your real experience for this job. Never invents skills.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => gen.mutate()} disabled={gen.isPending}>
          {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {gen.isPending ? "Optimizing…" : versions.length ? "Generate new version" : "Generate optimized resume"}
        </Button>
      </div>

      {gen.isPending && <AIThinking size="md" steps={[
        "📊  Reading job description…",
        "🧠  Mapping Career Brain evidence…",
        "🎯  Reordering skills and projects…",
        "✍️   Rewriting bullets…",
        "🔑  Weaving in ATS keywords…",
      ]} />}

      {loading ? null : versions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No optimized resume yet"
          hint="Generate a version tailored to this job description."
        />
      ) : (
        <div className="space-y-3">
          {versions.map((v: any) => (
            <div key={v.id} className="rounded-xl border border-border bg-elevated p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{v.version_name}</p>
                    {v.is_active && (
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ATS {v.ats_score ?? "—"}/100 · Readiness {v.readiness_score ?? "—"}/100 ·{" "}
                    {new Date(v.created_at).toLocaleString()}
                  </p>
                  {v.keywords_added?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(v.keywords_added as string[]).slice(0, 12).map((k) => (
                        <span key={k} className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          + {k}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {!v.is_active && (
                  <Button variant="ghost" size="sm" onClick={() => activate.mutate(v.id)}>
                    Set active
                  </Button>
                )}
              </div>
            </div>
          ))}
          {active && <ResumePreview version={active} />}
        </div>
      )}
    </div>
  );
}

function ResumePreview({ version }: { version: any }) {
  const [q] = useState(null);
  void q;
  return (
    <details className="rounded-xl border border-border bg-background p-4">
      <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Preview active version
      </summary>
      <ResumeContent workspaceId={version.workspace_id ?? ""} versionId={version.id} />
    </details>
  );
}

function ResumeContent({ versionId }: { versionId: string; workspaceId: string }) {
  const { data } = useQuery({
    queryKey: ["resume-version", versionId],
    queryFn: async () => {
      const mod = await import("@/lib/workspace-assistant.functions");
      return mod.getResumeVersion({ data: { versionId } });
    },
  });
  if (!data) return <p className="mt-3 text-xs text-muted-foreground">Loading…</p>;
  const c = data.optimized_content as any;
  if (!c) return null;
  return (
    <div className="mt-3 space-y-4 text-sm">
      {c.professional_summary && (
        <section>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-primary">Summary</h4>
          <p className="mt-1 text-foreground/90">{c.professional_summary}</p>
        </section>
      )}
      {(c.skills ?? []).length > 0 && (
        <section>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-primary">Skills</h4>
          <div className="mt-1 space-y-1">
            {(c.skills as any[]).map((s, i) => (
              <p key={i}><span className="text-muted-foreground">{s.category}:</span> {(s.items ?? []).join(", ")}</p>
            ))}
          </div>
        </section>
      )}
      {(c.experience ?? []).length > 0 && (
        <section>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-primary">Experience</h4>
          <div className="mt-1 space-y-3">
            {(c.experience as any[]).map((e, i) => (
              <div key={i}>
                <p className="font-medium">{e.role} · <span className="text-muted-foreground">{e.company}</span> {e.dates && <span className="text-xs text-muted-foreground">· {e.dates}</span>}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-foreground/90">
                  {(e.bullets ?? []).map((b: string, j: number) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
      {(c.projects ?? []).length > 0 && (
        <section>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-primary">Projects</h4>
          <div className="mt-1 space-y-2">
            {(c.projects as any[]).map((p, i) => (
              <div key={i}>
                <p className="font-medium">{p.name}</p>
                <p className="text-foreground/90">{p.description}</p>
                {(p.technologies ?? []).length > 0 && (
                  <p className="text-xs text-muted-foreground">{(p.technologies ?? []).join(" · ")}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------- Cover Letter ----------

function CoverTab({ workspaceId, snap, loading, onChange }: any) {
  const [style, setStyle] = useState<(typeof STYLES)[number]>("professional");
  const gen = useMutation({
    mutationFn: () => generateCoverLetterFn({ data: { workspaceId, style } }),
    onSuccess: () => { toast.success("Cover letter drafted."); onChange(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const letters = snap?.letters ?? [];
  const active = letters.find((l: any) => l.is_active) ?? letters[0];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-base font-semibold">AI Cover Letter Generator</h3>
        <p className="text-xs text-muted-foreground">Human-sounding, specific letters grounded in your real work.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {STYLES.map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={
              "rounded-full border px-2.5 py-1 text-[11px] capitalize transition " +
              (style === s
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground")
            }
          >
            {s}
          </button>
        ))}
        <Button variant="primary" size="sm" onClick={() => gen.mutate()} disabled={gen.isPending} className="ml-auto">
          {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {gen.isPending ? "Writing…" : letters.length ? "Regenerate" : "Generate cover letter"}
        </Button>
      </div>
      {gen.isPending && <AIThinking size="sm" steps={[
        "📖  Reading company signals…",
        "🎯  Matching your evidence to the JD…",
        "✍️   Writing in your chosen tone…",
      ]} />}
      {loading ? null : !active ? (
        <EmptyState icon={MessageSquare} title="No cover letter yet" hint="Pick a style and generate." />
      ) : (
        <CoverLetterEditor letter={active} onChange={onChange} />
      )}
    </div>
  );
}

function CoverLetterEditor({ letter, onChange }: { letter: any; onChange: () => void }) {
  const [greeting, setGreeting] = useState(letter.greeting ?? "");
  const [body, setBody] = useState(letter.body ?? "");
  const [closing, setClosing] = useState(letter.closing ?? "");
  const save = useMutation({
    mutationFn: () => updateCoverLetter({ data: { letterId: letter.id, greeting, body, closing } }),
    onSuccess: () => { toast.success("Saved."); onChange(); },
  });
  const copyAll = () => {
    navigator.clipboard.writeText(`${greeting}\n\n${body}\n\n${closing}`);
    toast.success("Copied to clipboard.");
  };
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full border border-border bg-elevated px-2 py-0.5 font-mono uppercase tracking-widest">
          {letter.style}
        </span>
        {new Date(letter.created_at).toLocaleString()}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" onClick={copyAll}><Copy className="h-3.5 w-3.5" /> Copy</Button>
          <Button variant="primary" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      <input
        value={greeting}
        onChange={(e) => setGreeting(e.target.value)}
        className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary/60"
        placeholder="Greeting"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={12}
        className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary/60"
      />
      <input
        value={closing}
        onChange={(e) => setClosing(e.target.value)}
        className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary/60"
        placeholder="Closing"
      />
      {letter.highlights?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {(letter.highlights as string[]).map((h) => (
            <span key={h} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{h}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------- Screening Q&A ----------

function ScreeningTab({ workspaceId, snap, loading, onChange }: any) {
  const gen = useMutation({
    mutationFn: () => generateStandardScreening({ data: { workspaceId } }),
    onSuccess: (r) => { toast.success(`${r.count} answers drafted.`); onChange(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const [q, setQ] = useState("");
  const ask = useMutation({
    mutationFn: () => answerCustomQuestion({ data: { workspaceId, question: q } }),
    onSuccess: () => { toast.success("Answer generated."); setQ(""); onChange(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const answers = snap?.screening ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">Screening Question Assistant</h3>
          <p className="text-xs text-muted-foreground">
            Common recruiter questions answered with your real background. Edit freely.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => gen.mutate()} disabled={gen.isPending}>
          {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {gen.isPending ? "Drafting…" : answers.length ? "Regenerate standard set" : "Generate standard answers"}
        </Button>
      </div>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask a custom job-specific question…"
          className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary/60"
        />
        <Button variant="secondary" size="sm" onClick={() => ask.mutate()} disabled={!q.trim() || ask.isPending}>
          <Send className="h-4 w-4" /> {ask.isPending ? "Thinking…" : "Ask"}
        </Button>
      </div>

      {loading ? null : answers.length === 0 && !gen.isPending ? (
        <EmptyState icon={MessagesSquare} title="No screening answers yet" hint="Generate the standard 9 or ask a custom question." />
      ) : (
        <div className="space-y-3">
          {(answers as any[]).map((a) => (
            <ScreeningItem key={a.id} row={a} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScreeningItem({ row, onChange }: { row: any; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(row.answer ?? "");
  const save = useMutation({
    mutationFn: () => updateScreeningAnswer({ data: { id: row.id, answer: text } }),
    onSuccess: () => { toast.success("Saved."); setEditing(false); onChange(); },
  });
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">{String(row.kind).replace(/_/g, " ")}</p>
          <p className="mt-1 font-medium">{row.question}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
          <Pencil className="h-3.5 w-3.5" /> {editing ? "Cancel" : "Edit"}
        </Button>
      </div>
      {editing ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="mt-2 w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <div className="mt-2 flex justify-end">
            <Button variant="primary" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{row.answer}</p>
      )}
      {row.key_points?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {(row.key_points as string[]).map((k) => (
            <span key={k} className="rounded-full border border-border bg-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {k}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------- Interview Prep ----------

function InterviewTab({ workspaceId, onChange }: { workspaceId: string; onChange: () => void }) {
  const qc = useQueryClient();
  const [focus, setFocus] = useState("");
  const [openSession, setOpenSession] = useState<string | null>(null);

  const { data: sessions } = useQuery({
    queryKey: ["interview-sessions", workspaceId],
    queryFn: () => listInterviewSessions({ data: { workspaceId } }),
  });
  const gen = useMutation({
    mutationFn: () => generateInterviewSession({ data: { workspaceId, focus: focus || undefined } }),
    onSuccess: (r) => {
      toast.success(`Interview pack ready · ${r.count} questions`);
      setOpenSession(r.sessionId);
      qc.invalidateQueries({ queryKey: ["interview-sessions", workspaceId] });
      onChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const active = useMemo(() => {
    if (!sessions?.length) return null;
    return sessions.find((s: any) => s.id === openSession) ?? sessions[0];
  }, [sessions, openSession]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-base font-semibold">AI Interview Prep</h3>
        <p className="text-xs text-muted-foreground">
          Role-specific questions with model answers grounded in your experience.
        </p>
      </div>
      <div className="flex gap-2">
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Optional focus (e.g. 'system design', 'React internals')"
          className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary/60"
        />
        <Button variant="primary" size="sm" onClick={() => gen.mutate()} disabled={gen.isPending}>
          {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {gen.isPending ? "Preparing…" : "Generate interview pack"}
        </Button>
      </div>
      {gen.isPending && <AIThinking size="md" steps={[
        "🎯  Choosing categories for this role…",
        "🧠  Grounding questions in your background…",
        "✍️   Drafting suggested answers…",
        "💡  Adding tips and common mistakes…",
      ]} />}

      {sessions?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {sessions.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setOpenSession(s.id)}
              className={
                "rounded-full border px-2.5 py-1 text-[11px] transition " +
                (active?.id === s.id
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground")
              }
            >
              {s.focus ?? "General"} · {s.total_questions ?? s.questions?.length ?? 0}q
            </button>
          ))}
        </div>
      ) : null}

      {active ? (
        <div className="space-y-3">
          {(active.questions as any[]).map((q) => (
            <InterviewQuestionCard key={q.id} q={q} />
          ))}
        </div>
      ) : (
        <EmptyState icon={MicVocal} title="No interview pack yet" hint="Generate a role-specific set of questions and answers." />
      )}
    </div>
  );
}

function InterviewQuestionCard({ q }: { q: any }) {
  const [open, setOpen] = useState(false);
  const [practiced, setPracticed] = useState(!!q.practiced);
  const toggle = useMutation({
    mutationFn: (next: boolean) => markQuestionPracticed({ data: { id: q.id, practiced: next } }),
    onSuccess: (_r, v) => setPracticed(v),
  });
  const diffColor = q.difficulty === "hard" ? "text-danger" : q.difficulty === "medium" ? "text-warning" : "text-success";
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-3 text-left">
        <div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="rounded-full border border-border bg-elevated px-1.5 py-0.5 font-mono uppercase tracking-widest text-muted-foreground">
              {String(q.category).replace(/_/g, " ")}
            </span>
            <span className={"font-mono uppercase tracking-widest " + diffColor}>{q.difficulty}</span>
          </div>
          <p className="mt-1.5 font-medium">{q.question}</p>
        </div>
        <div className="flex-none">
          <button
            onClick={(e) => { e.stopPropagation(); toggle.mutate(!practiced); }}
            className={
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition " +
              (practiced
                ? "border-success/40 bg-success/10 text-success"
                : "border-border bg-elevated text-muted-foreground hover:text-foreground")
            }
          >
            <CheckCircle2 className="h-3 w-3" /> {practiced ? "Practiced" : "Mark practiced"}
          </button>
        </div>
      </button>
      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Suggested answer</p>
            <p className="mt-1 whitespace-pre-wrap text-foreground/90">{q.suggested_answer}</p>
          </div>
          {q.key_points?.length ? (
            <ItemList label="Key points" items={q.key_points} tone="primary" />
          ) : null}
          {q.common_mistakes?.length ? (
            <ItemList label="Common mistakes" items={q.common_mistakes} tone="warning" />
          ) : null}
          {q.confidence_tips?.length ? (
            <ItemList label="Confidence tips" items={q.confidence_tips} tone="success" />
          ) : null}
          {q.follow_ups?.length ? (
            <ItemList label="Likely follow-ups" items={q.follow_ups} tone="muted" />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ItemList({ label, items, tone }: { label: string; items: string[]; tone: "primary" | "warning" | "success" | "muted" }) {
  const color =
    tone === "primary" ? "text-primary" :
    tone === "warning" ? "text-warning" :
    tone === "success" ? "text-success" : "text-muted-foreground";
  return (
    <div>
      <p className={"font-mono text-[10px] uppercase tracking-widest " + color}>{label}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-foreground/90">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}

// ---------- Package ----------

function PackageTab({ workspaceId, snap }: { workspaceId: string; snap: any }) {
  const build = useMutation({
    mutationFn: () => buildApplicationPackage({ data: { workspaceId } }),
    onSuccess: () => toast.success("Application package assembled."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const download = useMutation({
    mutationFn: async () => {
      for (const format of ["pdf", "docx", "txt"] as const) {
        const file = await exportApplicationPackage({ data: { workspaceId, format } });
        downloadBase64File(file.base64, file.fileName, file.mimeType);
      }
    },
    onSuccess: () => toast.success("Application package downloaded."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Download failed"),
  });
  const has = (n: number) => n > 0;
  const counts = {
    resume: snap?.versions?.length ?? 0,
    letter: snap?.letters?.length ?? 0,
    screening: snap?.screening?.length ?? 0,
    interview: snap?.sessions?.length ?? 0,
  };
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-base font-semibold">Application Package</h3>
        <p className="text-xs text-muted-foreground">Everything you need to submit — bundled and ready.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <PackageStat label="Resume versions" value={counts.resume} ok={has(counts.resume)} />
        <PackageStat label="Cover letter" value={counts.letter} ok={has(counts.letter)} />
        <PackageStat label="Screening answers" value={counts.screening} ok={has(counts.screening)} />
        <PackageStat label="Interview packs" value={counts.interview} ok={has(counts.interview)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={() => build.mutate()} disabled={build.isPending}>
          <Package className="h-4 w-4" /> {build.isPending ? "Assembling…" : "Mark as ready"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => download.mutate()} disabled={download.isPending}>
          {download.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {download.isPending ? "Preparing…" : "Download bundle"}
        </Button>
      </div>
    </div>
  );
}

function downloadBase64File(base64: string, fileName: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function PackageStat({ label, value, ok }: { label: string; value: number; ok: boolean }) {
  return (
    <div className={"rounded-xl border p-3 " + (ok ? "border-success/40 bg-success/5" : "border-border bg-elevated")}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={"mt-1 font-display text-xl font-semibold " + (ok ? "text-success" : "text-foreground/80")}>{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background p-6 text-center">
      <Icon className="mx-auto h-5 w-5 text-muted-foreground" />
      <p className="mt-2 font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

// ---------- Auto-generation pipeline ----------

type PipelineState = {
  steps: Array<{ key: string; label: string; done: boolean; running: boolean; error: string | null }>;
  running: boolean;
  runAll: () => void;
  runOne: (key: string) => void;
  autoTriggered: boolean;
};

function useAutoPipeline({
  workspaceId, snap, analysisReady, onChange,
}: {
  workspaceId: string;
  snap: any;
  analysisReady?: boolean;
  onChange: () => void;
}): PipelineState {
  const [running, setRunning] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const autoRanRef = useRef(false);

  const hasResume = (snap?.versions ?? []).length > 0;
  const hasCover = (snap?.letters ?? []).length > 0;
  const hasScreening = (snap?.screening ?? []).length > 0;
  const hasInterview = (snap?.sessions ?? []).length > 0;
  const hasPackage = (snap?.packages ?? []).length > 0;

  const runners: Record<string, () => Promise<unknown>> = {
    resume: () => generateResumeVersion({ data: { workspaceId } }),
    cover: () => generateCoverLetterFn({ data: { workspaceId, style: "professional" } }),
    screening: () => generateStandardScreening({ data: { workspaceId } }),
    interview: () => generateInterviewSession({ data: { workspaceId } }),
    package: () => buildApplicationPackage({ data: { workspaceId } }),
  };

  const steps = [
    { key: "resume", label: "Resume", done: hasResume, running: running === "resume", error: errors.resume ?? null },
    { key: "cover", label: "Cover Letter", done: hasCover, running: running === "cover", error: errors.cover ?? null },
    { key: "screening", label: "Screening", done: hasScreening, running: running === "screening", error: errors.screening ?? null },
    { key: "interview", label: "Interview", done: hasInterview, running: running === "interview", error: errors.interview ?? null },
    { key: "package", label: "Package", done: hasPackage, running: running === "package", error: errors.package ?? null },
  ];

  async function runOne(key: string) {
    if (running) return;
    setRunning(key);
    setErrors((e) => ({ ...e, [key]: null }));
    try {
      await runners[key]();
      onChange();
      toast.success(`${labelFor(key)} ready`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setErrors((e) => ({ ...e, [key]: msg }));
      toast.error(`${labelFor(key)} failed: ${msg}`);
    } finally {
      setRunning(null);
    }
  }

  async function runAll() {
    const missing = ["resume", "cover", "screening", "interview"].filter(
      (k) => !steps.find((s) => s.key === k)?.done,
    );
    const failures: string[] = [];
    for (const key of missing) {
      setRunning(key);
      setErrors((e) => ({ ...e, [key]: null }));
      try {
        await runners[key]();
        onChange();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed";
        failures.push(key);
        setErrors((e) => ({ ...e, [key]: msg }));
        toast.error(`${labelFor(key)} failed: ${msg}`);
      }
    }
    if (failures.length === 0) {
      setRunning("package");
      setErrors((e) => ({ ...e, package: null }));
      try {
        await runners.package();
        onChange();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed";
        failures.push("package");
        setErrors((e) => ({ ...e, package: msg }));
        toast.error(`Package failed: ${msg}`);
      }
    }
    setRunning(null);
    if (failures.length === 0) toast.success("Application pack ready");
    else toast.warning("Auto-generation finished with partial results.");
  }

  // Auto-trigger once per mount when analysis is ready and nothing is generated yet.
  useEffect(() => {
    if (autoRanRef.current) return;
    if (!snap) return;
    if (!analysisReady) return;
    const nothingYet = !hasResume && !hasCover && !hasScreening && !hasInterview;
    if (!nothingYet) return;
    autoRanRef.current = true;
    runAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, analysisReady]);

  return { steps, running: !!running, runAll, runOne, autoTriggered: autoRanRef.current };
}

function labelFor(key: string) {
  return { resume: "Resume", cover: "Cover Letter", screening: "Screening", interview: "Interview Pack", package: "Package" }[key] ?? key;
}

function PipelineBadge({ pipeline }: { pipeline: PipelineState }) {
  const done = pipeline.steps.filter((s) => s.done || s.key === "package").length;
  const total = pipeline.steps.length;
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {done}/{total} ready
      </span>
      <Button variant="ghost" size="sm" onClick={pipeline.runAll} disabled={pipeline.running}>
        {pipeline.running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
        {pipeline.running ? "Running…" : "Auto-generate all"}
      </Button>
    </div>
  );
}

function PipelineBar({ pipeline }: { pipeline: PipelineState }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-elevated/60 p-3">
      {pipeline.steps.map((s) => {
        const state = s.running ? "running" : s.error ? "error" : s.done ? "done" : "idle";
        return (
          <button
            key={s.key}
            onClick={() => pipeline.runOne(s.key)}
            disabled={pipeline.running}
            title={s.error ?? undefined}
            className={
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all " +
              (state === "done"
                ? "border-primary/40 bg-primary/10 text-primary"
                : state === "running"
                  ? "border-primary/60 bg-primary/5 text-primary animate-pulse"
                  : state === "error"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            {state === "done" ? <CheckCircle2 className="h-3 w-3" /> :
              state === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> :
              state === "error" ? <AlertCircle className="h-3 w-3" /> :
              <Wand2 className="h-3 w-3" />}
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

