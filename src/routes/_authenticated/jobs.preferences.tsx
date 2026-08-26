import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  DEFAULT_JOB_PREFERENCES,
  INDIA_HUBS,
  REGIONS,
  type JobPreferences,
  type WorkMode,
} from "@/lib/job-preferences";
import { getJobPreferences, saveJobPreferences } from "@/lib/job-preferences.functions";

export const Route = createFileRoute("/_authenticated/jobs/preferences")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Job Preferences — CareerOS" },
      {
        name: "description",
        content:
          "Set the roles, locations, work modes and salary targets CareerOS uses to discover and rank real job openings for you.",
      },
      { property: "og:title", content: "Job Preferences — CareerOS" },
      {
        property: "og:description",
        content: "Tune how CareerOS discovers and ranks live job openings for your profile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JobPreferencesPage,
});

const WORK_MODES: Array<{ id: WorkMode; label: string; hint: string }> = [
  { id: "remote", label: "Remote", hint: "Work from anywhere you're eligible" },
  { id: "hybrid", label: "Hybrid", hint: "Split between office and home" },
  { id: "onsite", label: "On-site", hint: "Full-time at the office" },
];

const LEVELS = ["intern", "entry", "junior", "mid", "senior", "lead"];
const TYPES = ["full_time", "part_time", "contract", "internship"];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-none border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-none border-border p-6">
      <h2 className="font-display text-lg tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function JobPreferencesPage() {
  const load = useServerFn(getJobPreferences);
  const save = useServerFn(saveJobPreferences);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["job-preferences"],
    queryFn: () => load(),
  });

  const [prefs, setPrefs] = useState<JobPreferences>({ ...DEFAULT_JOB_PREFERENCES });
  const [roleInput, setRoleInput] = useState("");

  useEffect(() => {
    if (data) setPrefs(data as JobPreferences);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (next: JobPreferences) => save({ data: next }),
    onSuccess: () => {
      toast.success("Preferences saved — your feed will use them on the next refresh.");
      qc.invalidateQueries({ queryKey: ["job-preferences"] });
      qc.invalidateQueries({ queryKey: ["job-sections"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save preferences"),
  });

  const toggle = <K extends keyof JobPreferences>(key: K, value: string) => {
    setPrefs((p) => {
      const list = (p[key] as unknown as string[]) ?? [];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...p, [key]: next } as JobPreferences;
    });
  };

  const has = (key: keyof JobPreferences, value: string) =>
    ((prefs[key] as unknown as string[]) ?? []).includes(value);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link
        to="/jobs"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to jobs
      </Link>

      <header className="mt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Discovery Controls
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight">Job Preferences</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          These settings are saved to your account and applied every time CareerOS crawls providers
          and ranks openings — so your feed stays realistic for your level and location.
        </p>
      </header>

      {isLoading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your preferences…
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <Section
            title="Target roles"
            description="Job titles you want CareerOS to search providers for."
          >
            <div className="flex flex-wrap gap-2">
              {prefs.preferredRoles.map((r) => (
                <Chip key={r} active onClick={() => toggle("preferredRoles", r)}>
                  {r} ✕
                </Chip>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                placeholder="e.g. Backend Engineer"
                className="rounded-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && roleInput.trim()) {
                    e.preventDefault();
                    toggle("preferredRoles", roleInput.trim());
                    setRoleInput("");
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() => {
                  if (!roleInput.trim()) return;
                  toggle("preferredRoles", roleInput.trim());
                  setRoleInput("");
                }}
              >
                Add
              </Button>
            </div>
          </Section>

          <Section
            title="Locations in India"
            description="Pick your hiring hubs. CareerOS is India-first and also matches nearby commutable cities."
          >
            <div className="flex flex-wrap gap-2">
              {INDIA_HUBS.map((c) => (
                <Chip
                  key={c}
                  active={has("preferredLocations", c)}
                  onClick={() => toggle("preferredLocations", c)}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </Section>

          <Section
            title="Work mode"
            description="Remote postings restricted to other countries are automatically filtered out."
          >
            <div className="flex flex-wrap gap-2">
              {WORK_MODES.map((m) => (
                <Chip
                  key={m.id}
                  active={has("workModes", m.id)}
                  onClick={() => toggle("workModes", m.id)}
                >
                  {m.label}
                </Chip>
              ))}
            </div>
          </Section>

          <Section
            title="Level & employment type"
            description="Used together with your resume so you never get flooded with roles far above your experience."
          >
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <Chip
                  key={l}
                  active={has("experienceLevels", l)}
                  onClick={() => toggle("experienceLevels", l)}
                >
                  {l}
                </Chip>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <Chip
                  key={t}
                  active={has("employmentTypes", t)}
                  onClick={() => toggle("employmentTypes", t)}
                >
                  {t.replace("_", " ")}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Salary target" description="Used to rank and optionally filter openings.">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="font-mono text-[11px] uppercase tracking-[0.14em]">Minimum</Label>
                <Input
                  type="number"
                  className="mt-2 rounded-none"
                  value={prefs.salaryMin ?? ""}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      salaryMin: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <Label className="font-mono text-[11px] uppercase tracking-[0.14em]">Maximum</Label>
                <Input
                  type="number"
                  className="mt-2 rounded-none"
                  value={prefs.salaryMax ?? ""}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      salaryMax: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <Label className="font-mono text-[11px] uppercase tracking-[0.14em]">Period</Label>
                <div className="mt-2 flex gap-2">
                  {(["year", "month"] as const).map((p) => (
                    <Chip
                      key={p}
                      active={prefs.salaryPeriod === p}
                      onClick={() => setPrefs((x) => ({ ...x, salaryPeriod: p }))}
                    >
                      {p}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section
            title="Reach & flexibility"
            description="Control how far outside your current level and country CareerOS looks."
          >
            <div className="space-y-4">
              {(
                [
                  {
                    key: "includeStretch",
                    label: "Show stretch opportunities",
                    hint: "Roles one level above you, in their own clearly-labelled shelf.",
                  },
                  {
                    key: "willingToRelocate",
                    label: "Willing to relocate",
                    hint: "Widens location matching beyond your current city.",
                  },
                  {
                    key: "openToInternational",
                    label: "Open to international roles",
                    hint: "Adds region-grouped shelves outside India.",
                  },
                  {
                    key: "strictSalaryFilter",
                    label: "Strictly hide jobs below my minimum",
                    hint: "Off by default — many postings hide their salary band.",
                  },
                ] as const
              ).map((row) => (
                <div key={row.key} className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-xs text-muted-foreground">{row.hint}</p>
                  </div>
                  <Switch
                    checked={Boolean(prefs[row.key])}
                    onCheckedChange={(v) => setPrefs((p) => ({ ...p, [row.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </Section>

          {prefs.openToInternational && (
            <Section
              title="Preferred regions"
              description="Leave empty to see every region CareerOS finds matches in."
            >
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <Chip
                    key={r.id}
                    active={has("preferredRegions", r.id)}
                    onClick={() => toggle("preferredRegions", r.id)}
                  >
                    {r.label}
                  </Chip>
                ))}
              </div>
            </Section>
          )}

          <div className="flex justify-end">
            <Button
              className="rounded-none"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(prefs)}
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save preferences
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
