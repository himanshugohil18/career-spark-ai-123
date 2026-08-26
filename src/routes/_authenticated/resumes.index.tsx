import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, FileText, Plus, Star, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ai/skeleton";
import { TEMPLATES } from "@/lib/resume-studio/document";
import {
  createStudioResume,
  deleteStudioResume,
  duplicateStudioResume,
  listStudioResumes,
  setDefaultStudioResume,
} from "@/lib/resume-studio.functions";

export const Route = createFileRoute("/_authenticated/resumes/")({
  head: () => ({
    meta: [
      { title: "Resume Studio · CareerOS" },
      {
        name: "description",
        content:
          "Build, tailor and export ATS-ready resumes from your verified CareerOS profile data.",
      },
      { property: "og:title", content: "Resume Studio · CareerOS" },
      {
        property: "og:description",
        content: "Build, tailor and export ATS-ready resumes from your CareerOS Career Brain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResumeStudioList,
});

const ORIGIN_LABEL: Record<string, string> = {
  scratch: "Built from scratch",
  profile: "From Career Brain",
  upload: "From upload",
  optimized: "Job-tailored",
};

function ResumeStudioList() {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["studio-resumes"],
    queryFn: () => listStudioResumes(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["studio-resumes"] });

  const create = useMutation({
    mutationFn: (mode: "profile" | "blank") =>
      createStudioResume({
        data: { name: name.trim() || (mode === "blank" ? "Untitled resume" : "My resume"), mode },
      }),
    onSuccess: ({ id }) => {
      setName("");
      void invalidate();
      navigate({ to: "/resumes/$resumeId", params: { resumeId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => duplicateStudioResume({ data: { id } }),
    onSuccess: () => {
      toast.success("Copy created.");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteStudioResume({ data: { id } }),
    onSuccess: () => {
      toast.success("Resume deleted.");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const makeDefault = useMutation({
    mutationFn: (id: string) => setDefaultStudioResume({ data: { id } }),
    onSuccess: () => {
      toast.success("Default resume updated.");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageShell width="wide">
      <PageHeader
        eyebrow="AI Tools"
        title="Resume Studio"
        description="Every resume here is built from data you approved in your Career Brain. Pick a template, edit inline, tailor it to a job, then export a text-based PDF or Word file that ATS parsers can actually read."
      />

      <section className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="resume-name">
              New resume name
            </label>
            <Input
              id="resume-name"
              value={name}
              placeholder="e.g. DevOps Engineer — 2026"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => create.mutate("profile")} disabled={create.isPending}>
              <Wand2 className="mr-1.5 h-4 w-4" />
              Use my profile
            </Button>
            <Button variant="outline" onClick={() => create.mutate("blank")} disabled={create.isPending}>
              <Plus className="mr-1.5 h-4 w-4" />
              Blank
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {TEMPLATES.length} templates available · switch templates any time without retyping
          content.
        </p>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          body="Create one from your Career Brain to get an ATS score in seconds."
        />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((row) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = row as any;
            const template = TEMPLATES.find((t) => t.id === r.template);
            return (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/resumes/$resumeId"
                      params={{ resumeId: r.id }}
                      className="truncate text-sm font-semibold hover:underline"
                    >
                      {r.version_name}
                    </Link>
                    {r.is_default ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      ORIGIN_LABEL[r.origin] ?? r.origin,
                      template?.name,
                      r.target_company ? `Tailored for ${r.target_company}` : null,
                      typeof r.ats_score === "number" ? `ATS ${r.ats_score}/100` : null,
                      `Updated ${new Date(r.updated_at).toLocaleDateString()}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/resumes/$resumeId" params={{ resumeId: r.id }}>
                      Open
                    </Link>
                  </Button>
                  {!r.is_default ? (
                    <Button variant="ghost" size="sm" onClick={() => makeDefault.mutate(r.id)}>
                      <Star className="mr-1 h-3.5 w-3.5" /> Default
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => duplicate.mutate(r.id)}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete "${r.version_name}"?`)) remove.mutate(r.id);
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
