import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  approveResume,
  getParsedResume,
  retryParse,
} from "@/lib/resume.functions";
import {
  ParsedResumeSchema,
  SKILL_CATEGORY_LABELS,
  type ParsedResume,
} from "@/lib/resume-schema";
import { computeCompleteness } from "@/lib/completeness";

export const Route = createFileRoute("/_authenticated/resume-review/$resumeId")({
  component: ReviewPage,
  head: () => ({
    meta: [{ title: "Review Resume · CareerOS" }],
  }),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl p-10 text-center">
      <h1 className="font-display text-xl">Something went wrong loading this review.</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button className="mt-4" onClick={reset}>Try again</Button>
    </div>
  ),
  notFoundComponent: () => <div className="p-10">Resume not found.</div>,
});

const ease = [0.22, 1, 0.36, 1] as const;

function ConfidenceBadge({ value }: { value: number | null | undefined }) {
  const v = typeof value === "number" ? value : 0.9;
  const pct = Math.round(v * 100);
  const tone =
    v >= 0.9 ? "text-success border-success/40 bg-success/10"
    : v >= 0.75 ? "text-primary border-primary/40 bg-primary/10"
    : "text-warning border-warning/40 bg-warning/10";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px]", tone)}>
      {v < 0.75 && <ShieldAlert className="h-3 w-3" />}
      {pct}%
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
  onAdd,
}: {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
}) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Section</p>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {onAdd && (
        <Button size="sm" variant="ghost" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      )}
    </div>
  );
}

function ReviewPage() {
  const { resumeId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const loadFn = useServerFn(getParsedResume);
  const approveFn = useServerFn(approveResume);
  const retryFn = useServerFn(retryParse);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["parsed-resume", resumeId],
    queryFn: () => loadFn({ data: { resumeId } }),
  });

  const [draft, setDraft] = useState<ParsedResume | null>(null);
  useEffect(() => {
    if (data?.parsed) setDraft(data.parsed as ParsedResume);
  }, [data?.parsed]);

  const retryMut = useMutation({
    mutationFn: () => retryFn({ data: { resumeId } }),
    onSuccess: () => {
      toast.success("Retried parsing.");
      void refetch();
    },
    onError: (e) => toast.error("Retry failed", { description: (e as Error).message }),
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("Nothing to approve.");
      const clean = ParsedResumeSchema.parse(draft);
      return approveFn({ data: { resumeId, edited: clean } });
    },
    onSuccess: async () => {
      toast.success("Career Brain activated.", {
        description: "Your workspace is now personalized.",
      });
      await qc.invalidateQueries();
      void navigate({ to: "/dashboard" });
    },
    onError: (e) => toast.error("Approval failed", { description: (e as Error).message }),
  });

  const lowConfidence = useMemo(() => {
    if (!draft) return 0;
    let n = 0;
    Object.values(draft.skills).forEach((arr) =>
      arr.forEach((s) => { if (s.confidence < 0.75) n++; }),
    );
    [...draft.workExperiences, ...draft.projects, ...draft.education, ...draft.certifications, ...draft.languages].forEach(
      (item) => { if ((item as { confidence: number }).confidence < 0.75) n++; },
    );
    return n;
  }, [draft]);

  const completeness = useMemo(() => {
    if (!draft) return null;
    return computeCompleteness({
      profile: {
        github_url: draft.personal.github,
        linkedin_url: draft.personal.linkedin,
        portfolio_url: draft.personal.portfolio,
        preferred_role: draft.personal.preferredRole,
        preferred_location: draft.personal.preferredLocation,
        expected_salary: draft.personal.expectedSalary,
        professional_summary: draft.personal.professionalSummary,
      },
      certificationsCount: draft.certifications.length,
      projectsCount: draft.projects.length,
    });
  }, [draft]);

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading review…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl p-10 text-center">
        <h1 className="font-display text-xl">Couldn't load this resume.</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(error as Error)?.message ?? "Unknown error"}</p>
        <Button className="mt-4" onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  if (data.status === "failed" || !draft) {
    return (
      <div className="mx-auto max-w-2xl p-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-danger/40 bg-danger/10 text-danger">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="mt-4 font-display text-xl">Parsing failed.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.errorMessage ?? "The AI could not extract structured data from this resume."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="ghost" onClick={() => void navigate({ to: "/dashboard" })}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={() => retryMut.mutate()} disabled={retryMut.isPending}>
            {retryMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const update = (fn: (d: ParsedResume) => ParsedResume) =>
    setDraft((prev) => (prev ? fn(structuredClone(prev)) : prev));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
      className="mx-auto max-w-5xl space-y-6 p-4 md:p-8"
    >
      {/* Header */}
      <div className="surface-elevated rounded-2xl border border-border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Step 2 · Review AI Extraction
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Approve your Career Brain
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              I extracted every meaningful signal from <span className="text-foreground">{data.fileName}</span>.
              Edit anything that looks off, then approve to activate the Brain.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Overall confidence</span>
              <ConfidenceBadge value={draft.overallConfidence} />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => retryMut.mutate()} disabled={retryMut.isPending}>
                {retryMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Re-parse
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => approveMut.mutate()}
                disabled={approveMut.isPending}
              >
                {approveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve & activate
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat label="AI Model" value={data.aiModel ?? "gemini-3-flash"} />
          <MiniStat label="Resume version" value={`v${data.version}`} />
          <MiniStat label="Low-confidence items" value={String(lowConfidence)} tone={lowConfidence > 0 ? "warning" : "default"} />
          <MiniStat label="Profile completeness" value={`${completeness?.score ?? 0}%`} />
        </div>
      </div>

      {/* Personal */}
      <Card>
        <SectionHeader title="Personal Information" subtitle="How you appear across every AI feature." />
        <div className="grid gap-3 md:grid-cols-2">
          <TextField label="Full name" value={draft.personal.fullName} onChange={(v) => update((d) => { d.personal.fullName = v; return d; })} />
          <TextField label="Current title" value={draft.personal.currentTitle} onChange={(v) => update((d) => { d.personal.currentTitle = v; return d; })} />
          <TextField label="Email" value={draft.personal.email} onChange={(v) => update((d) => { d.personal.email = v; return d; })} />
          <TextField label="Phone" value={draft.personal.phone} onChange={(v) => update((d) => { d.personal.phone = v; return d; })} />
          <TextField label="Location" value={draft.personal.location} onChange={(v) => update((d) => { d.personal.location = v; return d; })} />
          <TextField label="Years of experience" value={draft.personal.yearsOfExperience?.toString() ?? ""} onChange={(v) => update((d) => { d.personal.yearsOfExperience = v ? Number(v) : null; return d; })} />
          <TextField label="LinkedIn" value={draft.personal.linkedin} onChange={(v) => update((d) => { d.personal.linkedin = v; return d; })} />
          <TextField label="GitHub" value={draft.personal.github} onChange={(v) => update((d) => { d.personal.github = v; return d; })} />
          <TextField label="Portfolio" value={draft.personal.portfolio} onChange={(v) => update((d) => { d.personal.portfolio = v; return d; })} />
          <TextField label="Website" value={draft.personal.website} onChange={(v) => update((d) => { d.personal.website = v; return d; })} />
        </div>
        <div className="mt-3">
          <Label className="text-xs">Professional summary</Label>
          <Textarea
            rows={3}
            value={draft.personal.professionalSummary ?? ""}
            onChange={(e) => update((d) => { d.personal.professionalSummary = e.target.value || null; return d; })}
            className="mt-1"
          />
        </div>
      </Card>

      {/* Career Preferences */}
      <Card>
        <SectionHeader title="Career Preferences" subtitle="Tells the Job Agent what to hunt." />
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="Preferred role" value={draft.personal.preferredRole} onChange={(v) => update((d) => { d.personal.preferredRole = v; return d; })} />
          <TextField label="Preferred location" value={draft.personal.preferredLocation} onChange={(v) => update((d) => { d.personal.preferredLocation = v; return d; })} />
          <TextField label="Salary expectations" value={draft.personal.expectedSalary} onChange={(v) => update((d) => { d.personal.expectedSalary = v; return d; })} />
        </div>
      </Card>

      {/* Skills */}
      <Card>
        <SectionHeader title="Skills" subtitle="Low-confidence skills are highlighted. Remove or edit anything wrong." />
        <div className="space-y-4">
          {(Object.keys(SKILL_CATEGORY_LABELS) as Array<keyof typeof SKILL_CATEGORY_LABELS>).map((key) => {
            const items = draft.skills[key];
            return (
              <div key={key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {SKILL_CATEGORY_LABELS[key]}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      update((d) => {
                        d.skills[key] = [...d.skills[key], { name: "", confidence: 1 }];
                        return d;
                      })
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((s, i) => (
                    <div key={i} className={cn(
                      "inline-flex items-center gap-1 rounded-lg border bg-elevated pl-1.5 pr-1 py-1",
                      s.confidence < 0.75 ? "border-warning/40" : "border-border",
                    )}>
                      <input
                        value={s.name}
                        onChange={(e) => update((d) => { d.skills[key][i].name = e.target.value; return d; })}
                        className="w-28 bg-transparent px-1 text-xs outline-none"
                        placeholder="Skill"
                      />
                      <ConfidenceBadge value={s.confidence} />
                      <button
                        onClick={() => update((d) => { d.skills[key].splice(i, 1); return d; })}
                        className="ml-0.5 rounded p-0.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground/70">No items — add one if you have this skill.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Experience */}
      <ListSection
        title="Experience"
        items={draft.workExperiences}
        onAdd={() =>
          update((d) => {
            d.workExperiences.push({
              company: "", role: "", location: null, employmentType: null,
              startDate: null, endDate: null, isCurrent: false, duration: null,
              responsibilities: [], technologies: [], achievements: [], confidence: 1,
            });
            return d;
          })
        }
        onRemove={(i) => update((d) => { d.workExperiences.splice(i, 1); return d; })}
        onMove={(i, dir) => update((d) => {
          const j = i + dir;
          if (j < 0 || j >= d.workExperiences.length) return d;
          [d.workExperiences[i], d.workExperiences[j]] = [d.workExperiences[j], d.workExperiences[i]];
          return d;
        })}
        render={(item, i) => (
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Company" value={item.company} onChange={(v) => update((d) => { d.workExperiences[i].company = v ?? ""; return d; })} />
            <TextField label="Role" value={item.role} onChange={(v) => update((d) => { d.workExperiences[i].role = v ?? ""; return d; })} />
            <TextField label="Location" value={item.location} onChange={(v) => update((d) => { d.workExperiences[i].location = v; return d; })} />
            <TextField label="Duration" value={item.duration} onChange={(v) => update((d) => { d.workExperiences[i].duration = v; return d; })} />
            <TextField label="Start date" value={item.startDate} onChange={(v) => update((d) => { d.workExperiences[i].startDate = v; return d; })} />
            <TextField label="End date" value={item.endDate} onChange={(v) => update((d) => { d.workExperiences[i].endDate = v; return d; })} />
            <div className="md:col-span-2">
              <Label className="text-xs">Responsibilities (one per line)</Label>
              <Textarea
                rows={3} className="mt-1"
                value={item.responsibilities.join("\n")}
                onChange={(e) => update((d) => { d.workExperiences[i].responsibilities = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean); return d; })}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Technologies (comma-separated)</Label>
              <Input
                className="mt-1"
                value={item.technologies.join(", ")}
                onChange={(e) => update((d) => { d.workExperiences[i].technologies = e.target.value.split(",").map((s) => s.trim()).filter(Boolean); return d; })}
              />
            </div>
          </div>
        )}
        titleOf={(item) => `${item.role || "Untitled"} · ${item.company || "Unknown"}`}
      />

      {/* Projects */}
      <ListSection
        title="Projects"
        items={draft.projects}
        onAdd={() => update((d) => {
          d.projects.push({ name: "", description: null, technologies: [], githubUrl: null, liveUrl: null, startDate: null, endDate: null, duration: null, responsibilities: [], achievements: [], confidence: 1 });
          return d;
        })}
        onRemove={(i) => update((d) => { d.projects.splice(i, 1); return d; })}
        onMove={(i, dir) => update((d) => {
          const j = i + dir;
          if (j < 0 || j >= d.projects.length) return d;
          [d.projects[i], d.projects[j]] = [d.projects[j], d.projects[i]];
          return d;
        })}
        render={(item, i) => (
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Name" value={item.name} onChange={(v) => update((d) => { d.projects[i].name = v ?? ""; return d; })} />
            <TextField label="Duration" value={item.duration} onChange={(v) => update((d) => { d.projects[i].duration = v; return d; })} />
            <TextField label="GitHub URL" value={item.githubUrl} onChange={(v) => update((d) => { d.projects[i].githubUrl = v; return d; })} />
            <TextField label="Live URL" value={item.liveUrl} onChange={(v) => update((d) => { d.projects[i].liveUrl = v; return d; })} />
            <div className="md:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea rows={2} className="mt-1" value={item.description ?? ""}
                onChange={(e) => update((d) => { d.projects[i].description = e.target.value || null; return d; })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Technologies (comma-separated)</Label>
              <Input className="mt-1" value={item.technologies.join(", ")}
                onChange={(e) => update((d) => { d.projects[i].technologies = e.target.value.split(",").map((s) => s.trim()).filter(Boolean); return d; })} />
            </div>
          </div>
        )}
        titleOf={(item) => item.name || "Untitled project"}
      />

      {/* Education */}
      <ListSection
        title="Education"
        items={draft.education}
        onAdd={() => update((d) => {
          d.education.push({ degree: "", institution: "", board: null, fieldOfStudy: null, startDate: null, endDate: null, cgpa: null, percentage: null, confidence: 1 });
          return d;
        })}
        onRemove={(i) => update((d) => { d.education.splice(i, 1); return d; })}
        onMove={(i, dir) => update((d) => {
          const j = i + dir;
          if (j < 0 || j >= d.education.length) return d;
          [d.education[i], d.education[j]] = [d.education[j], d.education[i]];
          return d;
        })}
        render={(item, i) => (
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Degree" value={item.degree} onChange={(v) => update((d) => { d.education[i].degree = v ?? ""; return d; })} />
            <TextField label="Institution" value={item.institution} onChange={(v) => update((d) => { d.education[i].institution = v ?? ""; return d; })} />
            <TextField label="Field of study" value={item.fieldOfStudy} onChange={(v) => update((d) => { d.education[i].fieldOfStudy = v; return d; })} />
            <TextField label="CGPA" value={item.cgpa} onChange={(v) => update((d) => { d.education[i].cgpa = v; return d; })} />
            <TextField label="Start" value={item.startDate} onChange={(v) => update((d) => { d.education[i].startDate = v; return d; })} />
            <TextField label="End" value={item.endDate} onChange={(v) => update((d) => { d.education[i].endDate = v; return d; })} />
          </div>
        )}
        titleOf={(item) => `${item.degree || "Degree"} · ${item.institution || "Institution"}`}
      />

      {/* Certifications */}
      <ListSection
        title="Certifications"
        items={draft.certifications}
        onAdd={() => update((d) => {
          d.certifications.push({ name: "", organization: null, issueDate: null, expiryDate: null, credentialId: null, credentialUrl: null, confidence: 1 });
          return d;
        })}
        onRemove={(i) => update((d) => { d.certifications.splice(i, 1); return d; })}
        onMove={(i, dir) => update((d) => {
          const j = i + dir;
          if (j < 0 || j >= d.certifications.length) return d;
          [d.certifications[i], d.certifications[j]] = [d.certifications[j], d.certifications[i]];
          return d;
        })}
        render={(item, i) => (
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Name" value={item.name} onChange={(v) => update((d) => { d.certifications[i].name = v ?? ""; return d; })} />
            <TextField label="Organization" value={item.organization} onChange={(v) => update((d) => { d.certifications[i].organization = v; return d; })} />
            <TextField label="Issue date" value={item.issueDate} onChange={(v) => update((d) => { d.certifications[i].issueDate = v; return d; })} />
            <TextField label="Expiry date" value={item.expiryDate} onChange={(v) => update((d) => { d.certifications[i].expiryDate = v; return d; })} />
            <TextField label="Credential URL" value={item.credentialUrl} onChange={(v) => update((d) => { d.certifications[i].credentialUrl = v; return d; })} />
          </div>
        )}
        titleOf={(item) => item.name || "Certification"}
      />

      {/* Languages */}
      <ListSection
        title="Languages"
        items={draft.languages}
        onAdd={() => update((d) => {
          d.languages.push({ name: "", proficiency: null, confidence: 1 });
          return d;
        })}
        onRemove={(i) => update((d) => { d.languages.splice(i, 1); return d; })}
        onMove={(i, dir) => update((d) => {
          const j = i + dir;
          if (j < 0 || j >= d.languages.length) return d;
          [d.languages[i], d.languages[j]] = [d.languages[j], d.languages[i]];
          return d;
        })}
        render={(item, i) => (
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Language" value={item.name} onChange={(v) => update((d) => { d.languages[i].name = v ?? ""; return d; })} />
            <TextField label="Proficiency" value={item.proficiency} onChange={(v) => update((d) => { d.languages[i].proficiency = v; return d; })} />
          </div>
        )}
        titleOf={(item) => `${item.name || "Language"}${item.proficiency ? ` · ${item.proficiency}` : ""}`}
      />

      {/* Completeness checklist */}
      {completeness && completeness.missing.length > 0 && (
        <Card>
          <SectionHeader title="Career Profile Completeness" subtitle={`${completeness.score}% complete — add the missing pieces after approving.`} />
          <ul className="space-y-2">
            {completeness.missing.map((m) => (
              <li key={m.key} className="flex items-start gap-3 rounded-lg border border-border/60 bg-elevated p-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-warning" />
                <div>
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.hint}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Footer actions */}
      <div className="sticky bottom-4 z-10">
        <div className="surface-elevated flex items-center justify-between gap-3 rounded-2xl border border-border p-3 shadow-xl">
          <Link to="/dashboard" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Cancel and return to dashboard
          </Link>
          <div className="flex items-center gap-2">
            {lowConfidence > 0 && (
              <span className="hidden text-xs text-warning md:inline">
                {lowConfidence} low-confidence {lowConfidence === 1 ? "item" : "items"} — please review.
              </span>
            )}
            <Button
              variant="primary"
              size="lg"
              onClick={() => approveMut.mutate()}
              disabled={approveMut.isPending}
            >
              {approveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Approve & activate Career Brain
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="surface-elevated rounded-2xl border border-border p-5 md:p-6">{children}</section>;
}

function MiniStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" }) {
  return (
    <div className={cn(
      "rounded-xl border p-3",
      tone === "warning" ? "border-warning/40 bg-warning/10" : "border-border bg-elevated",
    )}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function TextField({
  label, value, onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        className="mt-1"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      />
    </div>
  );
}

type WithConfidence = { confidence: number };

function ListSection<T extends WithConfidence>({
  title, items, onAdd, onRemove, onMove, render, titleOf,
}: {
  title: string;
  items: T[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  render: (item: T, i: number) => React.ReactNode;
  titleOf: (item: T) => string;
}) {
  return (
    <Card>
      <SectionHeader title={title} onAdd={onAdd} />
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      )}
      <div className="space-y-3">
        {items.map((item, i) => (
          <details key={i} className="group rounded-xl border border-border bg-elevated p-3" open>
            <summary className="flex cursor-pointer items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ConfidenceBadge value={item.confidence} />
                <span className="text-sm font-medium">{titleOf(item)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); onMove(i, -1); }}>↑</Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); onMove(i, 1); }}>↓</Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); onRemove(i); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </summary>
            <div className="mt-3">{render(item, i)}</div>
          </details>
        ))}
      </div>
    </Card>
  );
}
