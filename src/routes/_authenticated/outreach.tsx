import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, Mail, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ai/skeleton";
import {
  createOutreachMessage,
  deleteOutreachMessage,
  listOutreachMessages,
  updateOutreachMessage,
} from "@/lib/outreach.functions";

export const Route = createFileRoute("/_authenticated/outreach")({
  head: () => ({
    meta: [
      { title: "Recruiter Outreach · CareerOS" },
      {
        name: "description",
        content:
          "Generate grounded recruiter DMs, cold emails, referral asks and follow-ups from your real CareerOS profile.",
      },
      { property: "og:title", content: "Recruiter Outreach · CareerOS" },
      {
        property: "og:description",
        content: "AI outreach messages grounded in your verified CareerOS experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OutreachPage,
});

const KINDS = [
  { id: "recruiter_dm", label: "Recruiter DM" },
  { id: "cold_email", label: "Cold email" },
  { id: "referral_request", label: "Referral request" },
  { id: "follow_up", label: "Follow-up" },
  { id: "thank_you", label: "Interview thank-you" },
] as const;

const TONES = ["professional", "warm", "direct", "enthusiastic", "formal"] as const;

type Kind = (typeof KINDS)[number]["id"];
type Tone = (typeof TONES)[number];

function OutreachPage() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<Kind>("recruiter_dm");
  const [tone, setTone] = useState<Tone>("professional");
  const [recipient, setRecipient] = useState("");
  const [context, setContext] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["outreach-messages"],
    queryFn: () => listOutreachMessages(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["outreach-messages"] });

  const generate = useMutation({
    mutationFn: () =>
      createOutreachMessage({
        data: {
          kind,
          tone,
          recipient: recipient.trim() || undefined,
          extraContext: context.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Message drafted.");
      setContext("");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markSent = useMutation({
    mutationFn: ({ id, sent }: { id: string; sent: boolean }) =>
      updateOutreachMessage({ data: { id, markSent: sent } }),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteOutreachMessage({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted.");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = async (id: string, subject: string | null, body: string) => {
    const text = subject ? `Subject: ${subject}\n\n${body}` : body;
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="AI Tools"
        title="Recruiter outreach"
        description="Drafts are grounded in your Career Brain — real roles, real projects, real skills. The assistant is instructed never to invent mutual connections, metrics or history."
      />

      <section className="space-y-4 rounded-xl border border-border bg-card/60 p-5">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                kind === k.id ? "border-primary bg-primary/10 text-primary" : "border-border"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" htmlFor="recipient">
              Recipient (optional)
            </Label>
            <Input
              id="recipient"
              value={recipient}
              placeholder="Priya, Talent Partner at Zeta"
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tone</Label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`rounded-md border px-2.5 py-1 text-xs capitalize transition ${
                    tone === t ? "border-primary bg-primary/10 text-primary" : "border-border"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground" htmlFor="context">
            Anything specific to mention? (optional)
          </Label>
          <Textarea
            id="context"
            rows={3}
            value={context}
            placeholder="Role I want, where I saw the posting, notice period…"
            onChange={(e) => setContext(e.target.value)}
          />
        </div>

        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          {generate.isPending ? "Drafting…" : "Draft message"}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Your messages</h2>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Mail className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No drafts yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {(data ?? []).map((m) => (
              <li key={m.id} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {[
                      KINDS.find((k) => k.id === m.kind)?.label ?? m.kind,
                      m.tone,
                      m.recipient,
                      m.companyName ? `${m.jobTitle ?? "Role"} at ${m.companyName}` : null,
                      new Date(m.createdAt).toLocaleString(),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => copy(m.id, m.subject, m.body)}>
                      {copiedId === m.id ? (
                        <Check className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <Copy className="mr-1 h-3.5 w-3.5" />
                      )}
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markSent.mutate({ id: m.id, sent: !m.sentAt })}
                    >
                      {m.sentAt ? "Mark unsent" : "Mark sent"}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Delete draft" onClick={() => remove.mutate(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {m.subject ? <p className="mt-2 text-sm font-semibold">{m.subject}</p> : null}
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{m.body}</p>
                {m.sentAt ? (
                  <p className="mt-2 text-[11px] text-primary">
                    Sent {new Date(m.sentAt).toLocaleString()}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
