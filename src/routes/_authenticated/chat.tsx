import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Bot, Send, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ai/skeleton";
import { clearCareerChat, listCareerChat, sendCareerChat } from "@/lib/career-chat.functions";

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

const SUGGESTIONS = [
  "Which of my current matches should I apply to first?",
  "What skills are blocking me from senior roles?",
  "Is my salary expectation realistic for my experience?",
  "How is my application pipeline doing this month?",
];

function CareerChatPage() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["career-chat"],
    queryFn: () => listCareerChat(),
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

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col p-6">
      <header className="flex items-start justify-between gap-3 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Career assistant</h1>
          <p className="text-sm text-muted-foreground">
            Answers use your Career Brain, live matches and application pipeline — not generic advice.
          </p>
        </div>
        {messages.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => clear.mutate()} disabled={clear.isPending}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear
          </Button>
        ) : null}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-card/40 p-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : messages.length === 0 ? (
          <div className="space-y-4 py-8 text-center">
            <Bot className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Ask anything about your job search.</p>
            <div className="mx-auto grid max-w-lg gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-lg border border-border px-3 py-2 text-left text-sm transition hover:border-primary/60 hover:bg-primary/5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" ? (
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Bot className="h-4 w-4" />
                </span>
              ) : null}
              <div
                className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background"
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
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <User className="h-4 w-4" />
                </span>
              ) : null}
            </div>
          ))
        )}
        {send.isPending ? (
          <p className="text-xs text-muted-foreground">Thinking through your profile…</p>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <Textarea
          rows={2}
          value={input}
          placeholder="Ask about matches, gaps, salary, interviews…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
        />
        <Button type="submit" disabled={send.isPending || input.trim().length < 2}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
