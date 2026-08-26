import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  Briefcase,
  GraduationCap,
  LineChart,
  Mic,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ai/skeleton";
import { clearCareerChat, listCareerChat, sendCareerChat } from "@/lib/career-chat.functions";
import { getAgentActivity } from "@/lib/career-intel.functions";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Career Assistant · CareerOS" },
      {
        name: "description",
        content:
          "Ask CareerOS about your matches, skill gaps, salary expectations and application pipeline — answers grounded in your own data.",
      },
      { property: "og:title", content: "Career Assistant · CareerOS" },
      {
        property: "og:description",
        content: "A career assistant that answers from your real CareerOS profile and job pipeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CareerChatPage,
});

const ease = [0.22, 1, 0.36, 1] as const;

function CareerChatPage() {
  const { session } = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    (user?.email?.split("@")[0] ?? "there");

  const { data, isLoading } = useQuery({
    queryKey: ["career-chat"],
    queryFn: () => listCareerChat(),
  });

  const activity = useQuery({
    queryKey: ["agent-activity"],
    queryFn: () => getAgentActivity(),
    staleTime: 60_000,
  });

  const send = useMutation({
    mutationFn: (message: string) => sendCareerChat({ data: { message } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["career-chat"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: () => clearCareerChat(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["career-chat"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data, send.isPending]);

  const submit = (text: string) => {
    const message = text.trim();
    if (message.length < 2 || send.isPending) return;
    setInput("");
    send.mutate(message);
  };

  const messages = data ?? [];

  // Personalized pre-chat insights from real activity
  const a = activity.data;
  const insights: { icon: typeof Briefcase; text: string }[] = [];
  if (a) {
    if (a.highMatchCount > 0) insights.push({ icon: Briefcase, text: `${a.highMatchCount} high-match roles are ready for you to review` });
    else if (a.matchCount > 0) insights.push({ icon: Briefcase, text: `${a.matchCount} roles are currently ranked against your profile` });
    if (a.workspaceCount > 0) insights.push({ icon: LineChart, text: `${a.workspaceCount} application${a.workspaceCount === 1 ? "" : "s"} in your pipeline${a.readyWorkspaceCount > 0 ? ` — ${a.readyWorkspaceCount} ready to submit` : ""}` });
    if (a.gapCount > 0) insights.push({ icon: GraduationCap, text: `${a.gapCount} skill gap${a.gapCount === 1 ? "" : "s"} identified for your target roles` });
    if (a.interviewSessionCount > 0) insights.push({ icon: Mic, text: `${a.interviewSessionCount} interview session${a.interviewSessionCount === 1 ? "" : "s"} available to practice` });
  }

  const hour = new Date().getHours();
  const daypart = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const suggestions = [
    a?.highMatchCount ? "Which job should I apply to today?" : "Which of my current matches should I apply to first?",
    a?.gapCount ? "What skills are blocking me right now?" : "What skills are blocking me from senior roles?",
    "Review my career progress this month",
    "Prepare me for my next interview",
  ];

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-4xl flex-col p-4 md:p-6">
      <header className="flex items-start justify-between gap-3 px-2 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">Career Assistant</h1>
            <p className="text-xs text-muted-foreground">
              Grounded in your Career Brain, live matches and pipeline — not generic advice.
            </p>
          </div>
        </div>
        {messages.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => clear.mutate()} disabled={clear.isPending}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear
          </Button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-20 w-3/4 rounded-2xl" />
            <Skeleton className="ml-auto h-14 w-1/2 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          /* ── Pre-conversation workspace ── */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
            className="flex h-full flex-col items-center justify-center p-6 md:p-10"
          >
            <h2 className="text-center font-display text-2xl font-semibold tracking-tight">
              Good {daypart}, {displayName}.
            </h2>
            <p className="mt-1.5 text-center text-sm text-muted-foreground">
              Here's where your career stands — ask me anything about it.
            </p>

            {insights.length > 0 && (
              <div className="mt-6 w-full max-w-xl space-y-2">
                {insights.slice(0, 4).map((ins, i) => (
                  <motion.div
                    key={ins.text}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.08 + i * 0.05, ease }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-[13px]"
                  >
                    <ins.icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground">{ins.text}</span>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.18 + i * 0.05, ease }}
                  onClick={() => submit(s)}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-[13px] font-medium transition-all hover:border-primary/30 hover:shadow-soft"
                >
                  {s}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── Conversation ── */
          <div className="space-y-5 p-4 md:p-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" ? (
                  <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </span>
                ) : null}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted/40"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                {m.role === "user" ? (
                  <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground">
                    <User className="h-4 w-4" />
                  </span>
                ) : null}
              </div>
            ))}
            {send.isPending ? (
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-muted/40 px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                    />
                  ))}
                  <span className="ml-1.5 text-xs text-muted-foreground">Reading your Career Brain…</span>
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        className="mt-4 flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft focus-within:border-primary/40"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <Textarea
          rows={1}
          value={input}
          placeholder="Ask about matches, gaps, salary, interviews…"
          className="min-h-[44px] flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
        />
        <Button type="submit" variant="primary" disabled={send.isPending || input.trim().length < 2} className="shrink-0">
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Answers cite your profile, matches and pipeline. <Link to="/profile" className="font-medium text-primary hover:underline">Update Career Brain</Link>
      </p>
    </div>
  );
}
