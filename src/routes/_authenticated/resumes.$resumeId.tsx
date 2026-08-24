import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, FileDown, RefreshCw, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ai/skeleton";
import { DocEditor, SectionOrderEditor } from "@/features/resume-studio/editor";
import { ResumePreview } from "@/features/resume-studio/templates";
import {
  downloadResumeDocx,
  downloadResumePdf,
  downloadResumeText,
} from "@/features/resume-studio/export";
import {
  TEMPLATES,
  isTemplateId,
  normalizeDoc,
  normalizeSectionOrder,
  type ResumeDoc,
  type SectionKey,
  type TemplateId,
} from "@/lib/resume-studio/document";
import {
  getStudioResume,
  refreshStudioFromBrain,
  saveStudioResume,
  scoreStudioResume,
} from "@/lib/resume-studio.functions";

export const Route = createFileRoute("/_authenticated/resumes/$resumeId")({
  head: () => ({
    meta: [
      { title: "Edit resume · CareerOS Resume Studio" },
      {
        name: "description",
        content:
          "Edit, template-switch, score and export one CareerOS resume with real ATS feedback.",
      },
      { property: "og:title", content: "Edit resume · CareerOS Resume Studio" },
      {
        property: "og:description",
        content: "Edit, score and export an ATS-ready resume in CareerOS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResumeStudioEditor,
});

function ResumeStudioEditor() {
  const { resumeId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["studio-resume", resumeId],
    queryFn: () => getStudioResume({ data: { id: resumeId } }),
  });

  const [doc, setDoc] = useState<ResumeDoc | null>(null);
  const [order, setOrder] = useState<SectionKey[]>([]);
  const [template, setTemplate] = useState<TemplateId>("ats_classic");
  const [name, setName] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDoc(normalizeDoc(data.doc));
    setOrder(normalizeSectionOrder(data.order));
    setTemplate(isTemplateId(data.meta.template) ? data.meta.template : "ats_classic");
    setName(data.meta.name);
    setDirty(false);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      saveStudioResume({
        data: { id: resumeId, name, template, sectionOrder: order, content: doc },
      }),
    onSuccess: () => {
      setDirty(false);
      toast.success("Saved.");
      void queryClient.invalidateQueries({ queryKey: ["studio-resume", resumeId] });
      void queryClient.invalidateQueries({ queryKey: ["studio-resumes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refresh = useMutation({
    mutationFn: () => refreshStudioFromBrain({ data: { id: resumeId } }),
    onSuccess: () => {
      toast.success("Pulled the latest Career Brain data.");
      void queryClient.invalidateQueries({ queryKey: ["studio-resume", resumeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rescore = useMutation({
    mutationFn: () => scoreStudioResume({ data: { id: resumeId } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const ats = rescore.data ?? data?.ats ?? null;

  const scoreTone = useMemo(() => {
    const score = ats?.score ?? 0;
    if (score >= 80) return "text-primary";
    if (score >= 60) return "text-foreground";
    return "text-destructive";
  }, [ats?.score]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not load this resume."}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/resumes">Back to Resume Studio</Link>
        </Button>
      </div>
    );
  }

  const update = (next: ResumeDoc) => {
    setDoc(next);
    setDirty(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Back to Resume Studio">
            <Link to="/resumes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Input
            className="h-9 w-64"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Sync profile
          </Button>
          <Button variant="outline" size="sm" onClick={() => rescore.mutate()} disabled={rescore.isPending}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Re-score
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadResumeDocx(doc, order, template, name)}
          >
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Word
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadResumeText(doc, order, name)}>
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Plain text
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              try {
                await downloadResumePdf(doc, order, template, name);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "PDF export failed.");
              }
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> {dirty ? "Save" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card/60 p-4">
            <h2 className="mb-3 text-sm font-semibold">Template</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTemplate(t.id);
                    setDirty(true);
                  }}
                  className={`rounded-lg border p-3 text-left transition ${
                    template === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.blurb}</p>
                </button>
              ))}
            </div>
          </section>

          {ats ? (
            <section className="rounded-xl border border-border bg-card/60 p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">ATS readiness</h2>
                <p className={`text-2xl font-bold ${scoreTone}`}>{ats.score}/100</p>
              </div>
              <ul className="mt-3 space-y-2">
                {ats.breakdown.map((b) => (
                  <li key={b.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{b.label}</span>
                      <span className="text-muted-foreground">{b.score}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${b.score}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{b.hint}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Scored deterministically from this document — no AI guesswork.
              </p>
            </section>
          ) : null}

          <section className="rounded-xl border border-border bg-card/60 p-4">
            <h2 className="mb-3 text-sm font-semibold">Section order</h2>
            <SectionOrderEditor
              order={order}
              onChange={(next) => {
                setOrder(next);
                setDirty(true);
              }}
            />
          </section>

          <DocEditor doc={doc} onChange={update} />
        </div>

        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-6rem)] lg:overflow-auto">
          <div className="rounded-xl border border-border shadow-sm">
            <ResumePreview doc={doc} order={order} template={template} />
          </div>
        </div>
      </div>
    </div>
  );
}
