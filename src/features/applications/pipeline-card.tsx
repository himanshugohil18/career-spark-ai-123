import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { Building2, GripVertical } from "lucide-react";
import { MatchRing } from "@/features/jobs/match-ring";
import { PIPELINE_COLUMNS, STAGE_LABEL, columnForStage } from "./pipeline-stages";

export interface PipelineWorkspace {
  id: string;
  current_stage?: string | null;
  readiness_score?: number | null;
  ats_score?: number | null;
  updated_at?: string | null;
  last_opened_at?: string | null;
  job?: { title?: string | null; location?: string | null } | null;
  company?: { name?: string | null; logo_url?: string | null } | null;
}

export function PipelineCard({
  workspace,
  disabled,
  onDropOnColumn,
  onStageSelect,
  onDragOverColumn,
  containerRef,
}: {
  workspace: PipelineWorkspace;
  disabled?: boolean;
  onDropOnColumn: (workspaceId: string, columnKey: string, cardEl: HTMLElement | null) => void;
  onStageSelect: (workspaceId: string, columnKey: string) => void;
  onDragOverColumn?: (columnKey: string | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const reduce = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const column = columnForStage(workspace.current_stage);

  const columnAtPoint = (point: { x: number; y: number }): string | null => {
    const container = containerRef.current;
    if (!container) return null;
    const columnEls = container.querySelectorAll<HTMLElement>("[data-column-key]");
    for (const el of Array.from(columnEls)) {
      const rect = el.getBoundingClientRect();
      if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
        return el.dataset.columnKey ?? null;
      }
    }
    return null;
  };

  const handleDrag = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    onDragOverColumn?.(columnAtPoint(info.point));
  };

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragging(false);
    onDragOverColumn?.(null);
    const key = columnAtPoint(info.point);
    if (key) onDropOnColumn(workspace.id, key, cardRef.current);
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      layoutId={`pipeline-card-${workspace.id}`}
      drag={!disabled}
      dragMomentum={false}
      dragElastic={0.12}
      whileDrag={{ scale: 1.04, zIndex: 30, boxShadow: "0 12px 32px -8px rgb(0 0 0 / 0.4)" }}
      onDragStart={() => setDragging(true)}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      dragConstraints={containerRef}
      dragSnapToOrigin
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={`group relative rounded-xl border border-border bg-elevated p-3 text-sm shadow-sm transition-colors ${
        dragging ? "cursor-grabbing" : disabled ? "" : "cursor-grab"
      } hover:border-primary/40`}
    >
      <div className="flex items-start gap-2.5">
        <div className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-md border border-border bg-background">
          {workspace.company?.logo_url ? (
            <img src={workspace.company.logo_url} alt="" className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to="/applications/$workspaceId"
            params={{ workspaceId: workspace.id }}
            onPointerDown={(e) => e.stopPropagation()}
            className="block truncate font-display text-sm font-semibold hover:text-primary"
          >
            {workspace.job?.title ?? "Role"}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{workspace.company?.name ?? "—"}</p>
        </div>
        <MatchRing value={Number(workspace.readiness_score ?? 0)} size={26} strokeWidth={3.5} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
          {STAGE_LABEL[workspace.current_stage ?? ""] ?? "—"}
        </span>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" aria-hidden="true" />
      </div>

      {/* Keyboard / screen-reader accessible alternative to drag */}
      <label className="sr-only" htmlFor={`stage-${workspace.id}`}>
        Move {workspace.job?.title ?? "role"} to pipeline stage
      </label>
      <select
        id={`stage-${workspace.id}`}
        value={column.key}
        disabled={disabled}
        onChange={(e) => onStageSelect(workspace.id, e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-2 w-full rounded-md border border-border bg-background px-1.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
      >
        {PIPELINE_COLUMNS.map((c) => (
          <option key={c.key} value={c.key}>
            {c.title}
          </option>
        ))}
      </select>
    </motion.div>
  );
}
