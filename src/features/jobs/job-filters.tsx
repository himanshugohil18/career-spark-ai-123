import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedFilters = {
  q?: string;
  role?: string;
  remoteStatus?: ("remote" | "hybrid" | "onsite")[];
  employmentType?: string[];
  experienceLevel?: string[];
  minMatch?: number;
  postedWithinDays?: number;
  salaryMin?: number;
  location?: string;
  technology?: string[];
};

const REMOTE_OPTS: ("remote" | "hybrid" | "onsite")[] = ["remote", "hybrid", "onsite"];
const EMP_OPTS = ["full_time", "part_time", "contract", "internship", "freelance"];
const EXP_OPTS = ["intern", "entry", "junior", "mid", "senior", "staff", "principal", "lead"];
const POSTED_OPTS = [1, 3, 7, 14, 30];

function countActive(v: FeedFilters): number {
  let n = 0;
  if (v.remoteStatus?.length) n += v.remoteStatus.length;
  if (v.employmentType?.length) n += v.employmentType.length;
  if (v.experienceLevel?.length) n += v.experienceLevel.length;
  if (v.technology?.length) n += v.technology.length;
  if (v.minMatch) n += 1;
  if (v.postedWithinDays) n += 1;
  if (v.salaryMin) n += 1;
  if (v.location) n += 1;
  return n;
}

export function JobFiltersPanel({
  value,
  onChange,
}: {
  value: FeedFilters;
  onChange: (v: FeedFilters) => void;
}) {
  const [locInput, setLocInput] = useState(value.location ?? "");
  const [techInput, setTechInput] = useState((value.technology ?? []).join(", "));
  const [expanded, setExpanded] = useState(true);
  const activeCount = countActive(value);

  function toggle<K extends keyof FeedFilters>(key: K, item: string) {
    const arr = ((value[key] as string[] | undefined) ?? []).slice();
    const idx = arr.indexOf(item);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(item);
    onChange({ ...value, [key]: arr.length ? arr : undefined } as FeedFilters);
  }

  const isSet = (k: keyof FeedFilters, v: string) =>
    ((value[k] as string[] | undefined) ?? []).includes(v);

  return (
    <section className="surface-card p-5 text-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" aria-hidden />
          Instrument Panel
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
              {activeCount} active
            </span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
        {activeCount > 0 && (
          <button
            onClick={() => onChange({})}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
      <div className="space-y-6 pt-5">
      <Section title="Remote">
        <ChipGroup>
          {REMOTE_OPTS.map((o) => (
            <Chip key={o} active={isSet("remoteStatus", o)} onClick={() => toggle("remoteStatus", o)}>
              {o}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="Employment">
        <ChipGroup>
          {EMP_OPTS.map((o) => (
            <Chip key={o} active={isSet("employmentType", o)} onClick={() => toggle("employmentType", o)}>
              {o.replace("_", " ")}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="Experience">
        <ChipGroup>
          {EXP_OPTS.map((o) => (
            <Chip key={o} active={isSet("experienceLevel", o)} onClick={() => toggle("experienceLevel", o)}>
              {o}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title={`AI Match ≥ ${value.minMatch ?? 0}%`}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value.minMatch ?? 0}
          onChange={(e) => onChange({ ...value, minMatch: Number(e.target.value) || undefined })}
          className="w-full accent-primary"
        />
      </Section>

      <Section title="Posted within">
        <ChipGroup>
          {POSTED_OPTS.map((d) => (
            <Chip
              key={d}
              active={value.postedWithinDays === d}
              onClick={() => onChange({ ...value, postedWithinDays: value.postedWithinDays === d ? undefined : d })}
            >
              {d}d
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="Minimum salary (USD)">
        <input
          type="number"
          value={value.salaryMin ?? ""}
          placeholder="e.g. 120000"
          onChange={(e) => onChange({ ...value, salaryMin: Number(e.target.value) || undefined })}
          className="w-full rounded-md border border-border bg-elevated px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
      </Section>

      <Section title="Location">
        <input
          value={locInput}
          onChange={(e) => setLocInput(e.target.value)}
          onBlur={() => onChange({ ...value, location: locInput.trim() || undefined })}
          placeholder="Berlin, Remote, etc."
          className="w-full rounded-md border border-border bg-elevated px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
      </Section>

      <Section title="Technology">
        <input
          value={techInput}
          onChange={(e) => setTechInput(e.target.value)}
          onBlur={() =>
            onChange({
              ...value,
              technology: techInput
                .split(",")
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean),
            })
          }
          placeholder="kubernetes, aws, terraform"
          className="w-full rounded-md border border-border bg-elevated px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
      </Section>
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <Filter className="h-3 w-3" /> {title}
      </p>
      {children}
    </div>
  );
}

function ChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs capitalize transition-colors",
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border bg-elevated text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
