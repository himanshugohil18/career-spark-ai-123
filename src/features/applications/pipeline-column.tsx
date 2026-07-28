import { AnimatePresence, motion } from "framer-motion";
import { Inbox } from "lucide-react";
import type { PipelineColumn } from "./pipeline-stages";
import { PipelineCard, type PipelineWorkspace } from "./pipeline-card";

export function PipelineColumnView({
  column,
  workspaces,
  disabled,
  activeColumnKey,
  onDropOnColumn,
  onStageSelect,
  onDragOverColumn,
  containerRef,
}: {
  column: PipelineColumn;
  workspaces: PipelineWorkspace[];
  disabled?: boolean;
  activeColumnKey: string | null;
  onDropOnColumn: (workspaceId: string, columnKey: string, cardEl: HTMLElement | null) => void;
  onStageSelect: (workspaceId: string, columnKey: string) => void;
  onDragOverColumn?: (columnKey: string | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isTarget = activeColumnKey === column.key;

  return (
    <div
      data-column-key={column.key}
      className={`flex min-w-[260px] flex-1 flex-col rounded-2xl border bg-card/40 p-2.5 transition-colors ${
        isTarget ? "border-primary/60 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between px-1.5 pb-2 pt-1">
        <div>
          <h4 className="font-display text-sm font-semibold">{column.title}</h4>
          <p className="text-[11px] text-muted-foreground">{column.description}</p>
        </div>
        <span className="rounded-full border border-border bg-elevated px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {workspaces.length}
        </span>
      </div>

      <div className="flex min-h-[120px] flex-1 flex-col gap-2.5 px-0.5 pb-1">
        <AnimatePresence initial={false}>
          {workspaces.map((w) => (
            <PipelineCard
              key={w.id}
              workspace={w}
              disabled={disabled}
              onDropOnColumn={onDropOnColumn}
              onStageSelect={onStageSelect}
              onDragOverColumn={onDragOverColumn}
              containerRef={containerRef}
            />
          ))}
        </AnimatePresence>

        {workspaces.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-8 text-center text-muted-foreground"
          >
            <Inbox className="h-4 w-4" />
            <p className="text-xs">Drop a card here</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
