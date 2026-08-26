import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, Play, Send, CheckCircle2, Circle, ChevronRight, RotateCcw, Loader2, Lightbulb, GraduationCap, TrendingUp, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ai/skeleton";
import { PageHeader } from "@/components/product/page-header";
import { Button } from "@/components/ui/button";
import {
  startInterviewSim,
  getInterviewSimSession,
  listInterviewSimSessions,
  submitInterviewSimAnswer,
} from "@/lib/simulator.functions";

export const Route = createFileRoute("/_authenticated/interview/simulator")({
  head: () => ({
    meta: [
      { title: "Mock Interview · CareerOS" },
      {
        name: "description",
        content: "Run an adaptive AI mock interview in CareerOS with scored answers and a final debrief.",
      },
      { property: "og:title", content: "Mock Interview · CareerOS" },
      {
        property: "og:description",
        content: "Run an adaptive AI mock interview in CareerOS with scored answers and a final debrief.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SimulatorPage,
});

type SessionState = { sessionId: string } | null;

function SimulatorPage() {
  const [active, setActive] = useState<SessionState>(null);
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sim-sessions"],
    queryFn: () => listInterviewSimSessions(),
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-10">
      <PageHeader
        eyebrow="Interview"
        title="AI mock interview"
        description="A live, adaptive interview grounded in your Career Brain. Every answer is scored with specific feedback — no generic questions."
      />

      {active ? (
        <ActiveSession sessionId={active.sessionId} onExit={() => setActive(null)} />
      ) : (
        <>
          <SetupCard onStarted={(id) => setActive({ sessionId: id })} />
          <section className="surface-card p-6 md:p-7">
            <h2 className="section-title">Past sessions</h2>
            {isLoading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </div>
            ) : !sessions?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No mock interviews yet. Start your first session above.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {sessions.map((s: any) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setActive({ sessionId: s.id })}
                      className="flex w-full items-center justify-between gap-4 py-3 text-left transition-colors hover:bg-accent/40 rounded-lg px-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{s.target_role}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()} · {s.answered_questions}/{s.planned_questions} answered
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {s.status === "completed" ? (
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {Number(s.overall_score).toFixed(1)}/10
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">in progress</span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

const INTERVIEW_TYPES = [
  { id: "mixed", label: "Full loop", hint: "Behavioral + project + technical" },
  { id: "technical", label: "Technical", hint: "Fundamentals, depth, problem solving" },
  { id: "behavioral", label: "Behavioral", hint: "STAR stories, ownership, conflict" },
  { id: "hr", label: "HR / Culture", hint: "Motivation, goals, expectations" },
  { id: "system_design", label: "System design", hint: "Scale, data, trade-offs" },
] as const;

type InterviewTypeId = (typeof INTERVIEW_TYPES)[number]["id"];

function SetupCard({ onStarted }: { onStarted: (id: string) => void }) {
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [type, setType] = useState<InterviewTypeId>("mixed");
  const [difficulty, setDifficulty] = useState<"easy" | "mixed" | "hard">("mixed");
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<"teacher" | "practice">("teacher");

  const startMut = useMutation({
    mutationFn: () =>
      startInterviewSim({
        data: {
          targetRole: role.trim(),
          difficulty,
          plannedQuestions: count,
          interviewType: type,
          targetCompany: company.trim() || null,
          mode,
        },
      }),
    onSuccess: (res) => onStarted(res.session.id),
    onError: (e: any) => toast.error(e?.message ?? "Could not start the interview."),
  });

  return (
    <section className="surface-card p-6 md:p-7">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Mic className="h-4 w-4 text-primary" /> Set up your interview
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Target role</span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Frontend Developer"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Company (optional)</span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Zoho"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium text-muted-foreground">Round type</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTERVIEW_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={type === t.id}
              onClick={() => setType(t.id)}
              title={t.hint}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                type === t.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span className="block font-semibold">{t.label}</span>
              <span className="block text-[11px] opacity-80">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium text-muted-foreground">Mode</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              { id: "teacher", label: "Teacher mode", hint: "Hints on demand + model answers after each question" },
              { id: "practice", label: "Real interview", hint: "No hints — just questions and scoring" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                mode === m.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span className="block font-semibold">{m.label}</span>
              <span className="block text-[11px] opacity-80">{m.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[auto_auto_1fr] md:items-end">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Starting difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="easy">Easy (stays easy)</option>
            <option value="mixed">Adaptive (adjusts to your scores)</option>
            <option value="hard">Hard (stays hard)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Questions</span>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {[3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="flex md:justify-end">
          <Button disabled={role.trim().length < 2 || startMut.isPending} onClick={() => startMut.mutate()}>
            {startMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start interview
          </Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        On adaptive difficulty the interviewer gets harder when you score well and easier when you
        struggle — exactly like a real interviewer calibrating mid-round.
      </p>
    </section>
  );
}

function ActiveSession({ sessionId, onExit }: { sessionId: string; onExit: () => void }) {
  const queryClient = useQueryClient();
  const [answer, setAnswer] = useState("");
  const [lastFeedback, setLastFeedback] = useState<any>(null);
  const [showHint, setShowHint] = useState(false);
  const [showModel, setShowModel] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["sim-session", sessionId],
    queryFn: () => getInterviewSimSession({ data: { sessionId } }),
  });

  const submitMut = useMutation({
    mutationFn: (v: { turnId: string; answer: string }) =>
      submitInterviewSimAnswer({ data: { sessionId, turnId: v.turnId, answer: v.answer } }),
    onSuccess: (res) => {
      setAnswer("");
      setLastFeedback(res);
      setShowHint(false);
      setShowModel(false);
      void queryClient.invalidateQueries({ queryKey: ["sim-session", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["sim-sessions"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not submit the answer."),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const { session, turns, currentTurn } = data;
  const completed = session.status === "completed";

  return (
    <div className="space-y-6">
      <section className="surface-card p-6 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {session.target_role}
              {session.target_company ? ` · ${session.target_company}` : ""} ·{" "}
              {String(session.interview_type ?? "mixed").replace("_", " ")} ·{" "}
              {session.answered_questions}/{session.planned_questions} answered
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <TrendingUp className="h-3 w-3" /> Now asking: {session.current_difficulty ?? session.difficulty}
              </span>
              {session.mode === "teacher" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  <GraduationCap className="h-3 w-3" /> Teacher mode
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(session.answered_questions / session.planned_questions) * 100}%` }}
              />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onExit}>
            <RotateCcw className="h-3.5 w-3.5" /> All sessions
          </Button>
        </div>
      </section>

      {completed ? (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface-card p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
              {Number(session.overall_score).toFixed(1)}
            </span>
            <div>
              <h2 className="section-title">Interview debrief</h2>
              <p className="text-xs text-muted-foreground">Overall score out of 10</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-foreground">{session.feedback_summary}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Strengths</p>
              <ul className="mt-2 space-y-1.5">
                {(session.strengths ?? []).map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Work on</p>
              <ul className="mt-2 space-y-1.5">
                {(session.improvements ?? []).map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <Circle className="mt-1 h-3 w-3 shrink-0 text-muted-foreground" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.section>
      ) : currentTurn ? (
        <motion.section
          key={currentTurn.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6 md:p-7"
        >
          <p className="text-xs font-medium text-muted-foreground">
            Question {currentTurn.turn_index + 1} of {session.planned_questions}
          </p>
          <h2 className="mt-2 text-lg font-semibold leading-snug text-foreground">{currentTurn.question}</h2>
          {currentTurn.focus_area && (
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Testing: {currentTurn.focus_area}
              {currentTurn.difficulty ? ` · ${currentTurn.difficulty}` : ""}
            </p>
          )}
          {session.mode === "teacher" && currentTurn.hint && (
            <div className="mt-3">
              {showHint ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                  <span className="mr-1 font-semibold text-primary">Coach hint:</span>
                  {currentTurn.hint}
                </div>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowHint(true)}>
                  <Lightbulb className="h-3.5 w-3.5" /> Need a hint?
                </Button>
              )}
            </div>
          )}
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={6}
            placeholder="Answer like you would in a real interview…"
            className="mt-4 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary"
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              disabled={answer.trim().length < 3 || submitMut.isPending}
              onClick={() => submitMut.mutate({ turnId: currentTurn.id, answer: answer.trim() })}
            >
              {submitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit answer
            </Button>
          </div>
        </motion.section>
      ) : null}

      {lastFeedback && !submitMut.isPending && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="surface-card p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {lastFeedback.score}/10
            </span>
            <p className="text-xs font-medium text-muted-foreground">Feedback on your last answer</p>
          </div>
          <p className="mt-2 text-sm text-foreground">{lastFeedback.feedback}</p>
          {(lastFeedback.pointsHit?.length || lastFeedback.pointsMissed?.length) && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {!!lastFeedback.pointsHit?.length && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">What worked</p>
                  <ul className="mt-2 space-y-1.5">
                    {lastFeedback.pointsHit.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!!lastFeedback.pointsMissed?.length && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What you missed
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {lastFeedback.pointsMissed.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {session.mode === "teacher" && lastFeedback.modelAnswer && (
            <div className="mt-4">
              {showModel ? (
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    How a strong candidate would answer
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{lastFeedback.modelAnswer}</p>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModel(true)}>
                  <GraduationCap className="h-3.5 w-3.5" /> Show model answer
                </Button>
              )}
            </div>
          )}
          {lastFeedback.difficulty && !lastFeedback.finished && (
            <p className="mt-3 text-xs text-muted-foreground">
              Next question calibrated to <span className="font-medium">{lastFeedback.difficulty}</span> difficulty.
            </p>
          )}
        </motion.section>
      )}

      {turns.filter((t: any) => t.answer !== null).length > 0 && (
        <section className="surface-card p-6 md:p-7">
          <h2 className="section-title">Transcript</h2>
          <ul className="mt-4 space-y-4">
            {turns
              .filter((t: any) => t.answer !== null)
              .map((t: any) => (
                <li key={t.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{t.question}</p>
                    {t.score !== null && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {Number(t.score).toFixed(0)}/10
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{t.answer}</p>
                  {t.feedback && <p className="mt-2 text-xs italic text-muted-foreground">{t.feedback}</p>}
                  {session.mode === "teacher" && t.model_answer && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-primary">
                        Model answer
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">{t.model_answer}</p>
                    </details>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}

      {completed && (
        <p className="text-center text-sm text-muted-foreground">
          Want to go deeper? <Link to="/coach" className="font-medium text-primary hover:underline">Ask your AI coach</Link> about the weak spots.
        </p>
      )}
    </div>
  );
}
