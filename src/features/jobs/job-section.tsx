import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { JobCard, type JobCardData } from "./job-card";
import { Stagger, StaggerItem } from "@/components/motion/reveal";

export type JobSectionData = {
  id: string;
  title: string;
  subtitle: string;
  reason: string;
  items: Array<JobCardData & { insights?: string[] }>;
};

export function JobSection({
  section,
  onSave,
  onClick,
}: {
  section: JobSectionData;
  onSave?: (jobId: string) => void;
  onClick?: (jobId: string) => void;
}) {
  if (!section.items.length) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <h2 className="font-display text-lg font-semibold">{section.title}</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{section.subtitle}</p>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:inline">
          {section.reason}
        </span>
      </div>
      <Stagger className="grid gap-3 md:grid-cols-2">
        {section.items.map((job) => (
          <StaggerItem key={`${section.id}:${job.id}`}>
            <JobCard job={job} insights={job.insights} onSave={onSave} onClick={onClick} />
          </StaggerItem>
        ))}
      </Stagger>
    </motion.section>
  );
}
