import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { PIPELINE_COLUMNS, columnForStage } from "./pipeline-stages";
import { PipelineColumnView } from "./pipeline-column";
import { ConfettiBurst } from "./confetti-burst";
import type { PipelineWorkspace } from "./pipeline-card";

/**
 * Local-optimistic pipeline board. There is no generic "update workspace
 * stage" server mutation in the codebase (stage transitions are each driven
 * by their own AI-generation step in workspace-assistant.functions.ts), so
 * dragging a card here re-buckets it client-side only and is NOT persisted.
 */
export function PipelineKanban({ workspaces }: { workspaces: PipelineWorkspace[] }) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [activeColumnKey, setActiveColumnKey] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveStage = useCallback((w: PipelineWorkspace) => overrides[w.id] ?? w.current_stage ?? null, [overrides]);

  const grouped = useMemo(() => {
    const map = new Map<string, PipelineWorkspace[]>();
    for (const col of PIPELINE_COLUMNS) map.set(col.key, []);
    for (const w of workspaces) {
      const col = columnForStage(effectiveStage(w));
      map.get(col.key)?.push(w);
    }
    return map;
  }, [workspaces, effectiveStage]);

  const moveTo = useCallback(
    (workspaceId: string, columnKey: string, cardEl: HTMLElement | null) => {
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace) return;
      const fromColumn = columnForStage(effectiveStage(workspace));
      if (fromColumn.key === columnKey) return;
      const targetColumn = PIPELINE_COLUMNS.find((c) => c.key === columnKey);
      if (!targetColumn) return;

      setOverrides((prev) => ({ ...prev, [workspaceId]: targetColumn.stages[0] }));
      toast.success(`${workspace.job?.title ?? "Application"} moved to ${targetColumn.title}`, {
        description: "Preview only — this board doesn't persist stage changes yet.",
      });

      if (targetColumn.key === "ready") {
        const containerRect = containerRef.current?.getBoundingClientRect();
        const cardRect = cardEl?.getBoundingClientRect();
        if (containerRect && cardRect) {
          setBurst({
            id: Date.now(),
            x: cardRect.left - containerRect.left + cardRect.width / 2,
            y: cardRect.top - containerRect.top + cardRect.height / 2,
          });
          setTimeout(() => setBurst(null), 800);
        }
      }
    },
    [workspaces, effectiveStage],
  );

  const onStageSelect = useCallback(
    (workspaceId: string, columnKey: string) => moveTo(workspaceId, columnKey, null),
    [moveTo],
  );

  const onDropOnColumn = useCallback(
    (workspaceId: string, columnKey: string, cardEl: HTMLElement | null) => {
      setActiveColumnKey(null);
      moveTo(workspaceId, columnKey, cardEl);
    },
    [moveTo],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-elevated/50 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none" />
        <p>
          Drag cards between columns, or use each card's stage dropdown. Board changes are a local preview and aren't
          saved — real stage progress is driven by the AI workflow inside each workspace.
        </p>
      </div>

      <div ref={containerRef} className="relative flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_COLUMNS.map((col) => (
          <PipelineColumnView
            key={col.key}
            column={col}
            workspaces={grouped.get(col.key) ?? []}
            activeColumnKey={activeColumnKey}
            onDropOnColumn={onDropOnColumn}
            onStageSelect={onStageSelect}
            onDragOverColumn={setActiveColumnKey}
            containerRef={containerRef}
          />
        ))}

        {burst && <ConfettiBurst key={burst.id} originX={burst.x} originY={burst.y} />}
      </div>
    </div>
  );
}
