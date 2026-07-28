/**
 * Pipeline columns are derived from the real `current_stage` values used by
 * `application_workspaces` (see src/lib/workspace.functions.ts /
 * workspace-assistant.functions.ts). No new statuses are invented — each
 * column simply groups the existing stage strings into a readable pipeline.
 */
export type Stage =
  | "workspace_created"
  | "company_analysis"
  | "job_analysis"
  | "resume_analysis"
  | "ats_analysis"
  | "gap_analysis"
  | "resume_optimization"
  | "ready_for_cover_letter"
  | "ready_for_interview"
  | "application_ready";

export const STAGE_LABEL: Record<string, string> = {
  workspace_created: "Created",
  company_analysis: "Company",
  job_analysis: "JD",
  resume_analysis: "Resume",
  ats_analysis: "ATS",
  gap_analysis: "Gap analysis",
  resume_optimization: "Optimizing",
  ready_for_cover_letter: "Cover letter",
  ready_for_interview: "Interview prep",
  application_ready: "Ready",
};

export interface PipelineColumn {
  key: string;
  title: string;
  description: string;
  /** Real current_stage values this column represents, in workflow order. */
  stages: Stage[];
}

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    key: "building",
    title: "Building",
    description: "Workspace + research underway",
    stages: ["workspace_created", "company_analysis", "job_analysis", "resume_analysis"],
  },
  {
    key: "optimizing",
    title: "Optimizing",
    description: "ATS + gap analysis, resume tuning",
    stages: ["ats_analysis", "gap_analysis", "resume_optimization"],
  },
  {
    key: "prepping",
    title: "Prepping",
    description: "Cover letter + interview prep",
    stages: ["ready_for_cover_letter", "ready_for_interview"],
  },
  {
    key: "ready",
    title: "Ready",
    description: "Application package assembled",
    stages: ["application_ready"],
  },
];

export function columnForStage(stage: string | null | undefined): PipelineColumn {
  const found = PIPELINE_COLUMNS.find((c) => c.stages.includes(stage as Stage));
  return found ?? PIPELINE_COLUMNS[0];
}

export function columnIndex(key: string): number {
  return PIPELINE_COLUMNS.findIndex((c) => c.key === key);
}
