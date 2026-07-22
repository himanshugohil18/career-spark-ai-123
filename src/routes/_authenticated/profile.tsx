import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Award,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileText,
  Github,
  GraduationCap,
  Languages as LanguagesIcon,
  Linkedin,
  Loader2,
  RotateCw,
  Save,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ai/skeleton";
import { ResumeUpload } from "@/features/resume/resume-upload";
import {
  deleteRecord,
  getWorkspace,
  updateProfile,
} from "@/lib/profile.functions";
import { setActiveResume } from "@/lib/resume.functions";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · CareerOS" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["workspace"],
    queryFn: () => getWorkspace(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["workspace"] });

  const deleteMutation = useMutation({
    mutationFn: (
      input: {
        table:
          | "work_experiences"
          | "projects"
          | "education"
          | "certifications"
          | "languages"
          | "skills"
          | "achievements"
          | "resumes";
        id: string;
      },
    ) => deleteRecord({ data: input }),
    onSuccess: () => {
      toast.success("Removed.");
      void invalidate();
    },
    onError: (e) => toast.error("Delete failed", { description: String(e) }),
  });


  if (isLoading || !data) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-10">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Career Brain
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Your profile
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Everything CareerOS knows about you. Every module — Discovery,
          Optimizer, Interview — reads from here.
        </p>
      </motion.div>

      {/* Resume manager */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Resume"
          title="Source of truth"
          count={data.resumes.length}
        />
        <ResumeUpload onCompleted={invalidate} compact />
        {data.resumes.length > 0 && (
          <div className="surface-card divide-y divide-border overflow-hidden">
            {data.resumes.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-elevated text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      v{r.version} · {r.file_name}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()} ·{" "}
                      {Math.round(r.file_size / 1024)} KB · {r.status}
                      {r.status === "approved" && " · Brain generated"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.is_active && (
                    <span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-success">
                      Active
                    </span>
                  )}
                  {r.status === "parsed" && !r.is_active && (
                    <Link to="/resume-review/$resumeId" params={{ resumeId: r.id }}>
                      <Button variant="ghost" size="sm">Review</Button>
                    </Link>
                  )}
                  {!r.is_active && r.status === "approved" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await setActiveResume({ data: { resumeId: r.id } });
                          toast.success(`Switched to v${r.version}.`);
                          void invalidate();
                        } catch (e) {
                          toast.error("Could not switch version", { description: (e as Error).message });
                        }
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Set active
                    </Button>
                  )}
                  {r.status === "failed" && (
                    <Link to="/resume-review/$resumeId" params={{ resumeId: r.id }}>
                      <Button variant="ghost" size="sm">
                        <RotateCw className="h-4 w-4" /> Retry
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      deleteMutation.mutate({ table: "resumes", id: r.id })
                    }
                    aria-label="Delete resume"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <PersonalSection profile={data.profile} onSaved={invalidate} />

      <ListSection
        eyebrow="Experience"
        icon={Briefcase}
        items={data.experiences.map((w) => ({
          id: w.id,
          title: w.role,
          subtitle: `${w.company}${w.location ? ` · ${w.location}` : ""}`,
          meta: [w.start_date, w.is_current ? "Present" : w.end_date]
            .filter(Boolean)
            .join(" – "),
          bullets: w.responsibilities,
          tags: w.technologies,
        }))}
        emptyMessage="No experience captured yet. Upload a resume to populate."
        onDelete={(id) =>
          deleteMutation.mutate({ table: "work_experiences", id })
        }
      />

      <ListSection
        eyebrow="Projects"
        icon={Wrench}
        items={data.projects.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: p.description ?? "",
          meta: [p.start_date, p.end_date].filter(Boolean).join(" – "),
          bullets: p.responsibilities,
          tags: p.technologies,
          links: [
            p.github_url ? { label: "Code", url: p.github_url } : null,
            p.live_url ? { label: "Live", url: p.live_url } : null,
          ].filter((x): x is { label: string; url: string } => !!x),
        }))}
        emptyMessage="No projects yet."
        onDelete={(id) => deleteMutation.mutate({ table: "projects", id })}
      />

      <ListSection
        eyebrow="Education"
        icon={GraduationCap}
        items={data.education.map((e) => ({
          id: e.id,
          title: e.degree,
          subtitle: [e.institution, e.field_of_study].filter(Boolean).join(" · "),
          meta: [e.start_date, e.end_date].filter(Boolean).join(" – "),
          tags: [e.cgpa && `CGPA ${e.cgpa}`, e.percentage && `${e.percentage}%`]
            .filter(Boolean)
            .map(String),
        }))}
        emptyMessage="No education yet."
        onDelete={(id) => deleteMutation.mutate({ table: "education", id })}
      />

      <ListSection
        eyebrow="Certifications"
        icon={Award}
        items={data.certifications.map((c) => ({
          id: c.id,
          title: c.name,
          subtitle: c.organization ?? "",
          meta: [c.issue_date, c.expiry_date && `expires ${c.expiry_date}`]
            .filter(Boolean)
            .join(" · "),
          links: c.credential_url
            ? [{ label: "Verify", url: c.credential_url }]
            : [],
        }))}
        emptyMessage="No certifications yet."
        onDelete={(id) =>
          deleteMutation.mutate({ table: "certifications", id })
        }
      />

      <SkillsSection
        skills={data.skills}
        onDelete={(id) => deleteMutation.mutate({ table: "skills", id })}
      />

      <ListSection
        eyebrow="Languages"
        icon={LanguagesIcon}
        items={data.languages.map((l) => ({
          id: l.id,
          title: l.name,
          subtitle: l.proficiency ?? "",
        }))}
        emptyMessage="No languages yet."
        onDelete={(id) => deleteMutation.mutate({ table: "languages", id })}
      />

      <ListSection
        eyebrow="Achievements"
        icon={Sparkles}
        items={data.achievements.map((a) => ({
          id: a.id,
          title: a.description,
          subtitle: [a.category, a.date].filter(Boolean).join(" · "),
        }))}
        emptyMessage="No achievements yet."
        onDelete={(id) => deleteMutation.mutate({ table: "achievements", id })}
      />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold">{title}</h2>
      </div>
      {typeof count === "number" && (
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {count} entries
        </span>
      )}
    </div>
  );
}

/* ------------------------------- Personal ------------------------------- */

type ProfileRow = NonNullable<
  Awaited<ReturnType<typeof getWorkspace>>["profile"]
>;

function PersonalSection({
  profile,
  onSaved,
}: {
  profile: ProfileRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => ({
    full_name: profile?.full_name ?? "",
    current_title: profile?.current_title ?? "",
    professional_summary: profile?.professional_summary ?? "",
    phone: profile?.phone ?? "",
    location: profile?.location ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
    github_url: profile?.github_url ?? "",
    portfolio_url: profile?.portfolio_url ?? "",
    website_url: profile?.website_url ?? "",
    years_of_experience:
      profile?.years_of_experience != null
        ? String(profile.years_of_experience)
        : "",
    preferred_role: profile?.preferred_role ?? "",
    preferred_location: profile?.preferred_location ?? "",
    expected_salary: profile?.expected_salary ?? "",
  }));

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () =>
      updateProfile({
        data: {
          full_name: form.full_name || null,
          current_title: form.current_title || null,
          professional_summary: form.professional_summary || null,
          phone: form.phone || null,
          location: form.location || null,
          linkedin_url: form.linkedin_url || null,
          github_url: form.github_url || null,
          portfolio_url: form.portfolio_url || null,
          website_url: form.website_url || null,
          years_of_experience: form.years_of_experience
            ? Number(form.years_of_experience)
            : null,
          preferred_role: form.preferred_role || null,
          preferred_location: form.preferred_location || null,
          expected_salary: form.expected_salary || null,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated.");
      onSaved();
    },
    onError: (e) => toast.error("Save failed", { description: String(e) }),
  });

  return (
    <section className="space-y-4">
      <SectionHeader eyebrow="Personal" title="Identity" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="surface-card space-y-5 p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <Input value={form.full_name} onChange={set("full_name")} />
          </Field>
          <Field label="Current title">
            <Input value={form.current_title} onChange={set("current_title")} />
          </Field>
        </div>

        <Field label="Professional summary">
          <textarea
            value={form.professional_summary}
            onChange={set("professional_summary")}
            rows={4}
            className="flex w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm shadow-soft transition-colors placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Phone">
            <Input value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={set("location")} />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="LinkedIn URL" icon={<Linkedin className="h-3.5 w-3.5" />}>
            <Input value={form.linkedin_url} onChange={set("linkedin_url")} />
          </Field>
          <Field label="GitHub URL" icon={<Github className="h-3.5 w-3.5" />}>
            <Input value={form.github_url} onChange={set("github_url")} />
          </Field>
          <Field label="Portfolio URL">
            <Input value={form.portfolio_url} onChange={set("portfolio_url")} />
          </Field>
          <Field label="Website URL">
            <Input value={form.website_url} onChange={set("website_url")} />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Years of experience">
            <Input
              type="number"
              min={0}
              step={0.5}
              value={form.years_of_experience}
              onChange={set("years_of_experience")}
            />
          </Field>
          <Field label="Preferred role">
            <Input value={form.preferred_role} onChange={set("preferred_role")} />
          </Field>
          <Field label="Preferred location">
            <Input
              value={form.preferred_location}
              onChange={set("preferred_location")}
            />
          </Field>
        </div>

        <Field label="Expected salary">
          <Input value={form.expected_salary} onChange={set("expected_salary")} />
        </Field>

        <div className="flex justify-end">
          <Button variant="primary" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

/* ------------------------------ List section ---------------------------- */

type ListItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  bullets?: string[];
  tags?: string[];
  links?: Array<{ label: string; url: string }>;
};

function ListSection({
  eyebrow,
  icon: Icon,
  items,
  emptyMessage,
  onDelete,
}: {
  eyebrow: string;
  icon: typeof Briefcase;
  items: ListItem[];
  emptyMessage: string;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="space-y-4">
      <SectionHeader eyebrow={eyebrow} title={`${items.length} ${eyebrow.toLowerCase()}`} />
      {items.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="surface-card group flex items-start gap-4 p-5"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-elevated text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  {item.meta && (
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {item.meta}
                    </span>
                  )}
                </div>

                {item.bullets && item.bullets.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-foreground/85">
                    {item.bullets.slice(0, 5).map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/70" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {(item.tags?.length || item.links?.length) && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {item.tags?.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-border bg-elevated px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                    {item.links?.map((l) => (
                      <a
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary transition-colors hover:bg-primary/20"
                      >
                        {l.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item.id)}
                aria-label="Delete"
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------- Skills -------------------------------- */

function SkillsSection({
  skills,
  onDelete,
}: {
  skills: Awaited<ReturnType<typeof getWorkspace>>["skills"];
  onDelete: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof skills>();
    for (const s of skills) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return Array.from(map.entries());
  }, [skills]);

  return (
    <section className="space-y-4">
      <SectionHeader eyebrow="Skills" title={`${skills.length} skills`} />
      {skills.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          No skills yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {grouped.map(([category, items]) => (
            <div key={category} className="surface-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {category}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {items.map((s) => (
                  <span
                    key={s.id}
                    className={cn(
                      "group inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-2 py-1 text-xs text-foreground/90 transition-colors",
                    )}
                  >
                    {s.name}
                    <button
                      type="button"
                      onClick={() => onDelete(s.id)}
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                      aria-label={`Remove ${s.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
