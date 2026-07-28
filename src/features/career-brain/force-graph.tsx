import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CareerBrainSnapshot } from "@/lib/career-brain.service";
import { buildGraphNodes, findSkillEvidence, type GraphNode } from "./graph-data";

const EASE = [0.22, 1, 0.36, 1] as const;
const VB_W = 900;
const VB_H = 560;
const CENTER = { x: VB_W / 2, y: VB_H / 2 };

type SimNode = GraphNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  homeX: number;
  homeY: number;
};

const KIND_COLOR: Record<GraphNode["kind"], string> = {
  user: "var(--color-primary)",
  skill: "var(--color-accent)",
  role: "var(--color-primary)",
  gap: "var(--color-destructive)",
};

const KIND_LABEL: Record<GraphNode["kind"], string> = {
  user: "You",
  skill: "Skill",
  role: "Target role",
  gap: "Gap",
};

function radiusFor(node: GraphNode) {
  if (node.kind === "user") return 30;
  if (node.kind === "role") return 14 + node.strength * 10;
  if (node.kind === "gap") return 10;
  return 8 + node.strength * 14;
}

function seedLayout(nodes: GraphNode[]): SimNode[] {
  const skills = nodes.filter((n) => n.kind === "skill");
  const roles = nodes.filter((n) => n.kind === "role");
  const gaps = nodes.filter((n) => n.kind === "gap");

  const place = (list: GraphNode[], startDeg: number, endDeg: number, baseR: number) =>
    list.map((n, i) => {
      const t = list.length <= 1 ? 0.5 : i / (list.length - 1);
      const deg = startDeg + (endDeg - startDeg) * t;
      const rad = (deg * Math.PI) / 180;
      const r = baseR + (i % 2 === 0 ? 0 : 34);
      return {
        ...n,
        x: CENTER.x + Math.cos(rad) * r,
        y: CENTER.y + Math.sin(rad) * r,
        vx: 0,
        vy: 0,
        r: radiusFor(n),
        homeX: CENTER.x + Math.cos(rad) * r,
        homeY: CENTER.y + Math.sin(rad) * r,
      } satisfies SimNode;
    });

  const skillNodes = place(skills, -160, 150, 195);
  const roleNodes = place(roles, -150, -30, 145);
  const gapNodes = place(gaps, 160, 260, 155);

  const userNode = nodes.find((n) => n.kind === "user");
  const seeded: SimNode[] = [...skillNodes, ...roleNodes, ...gapNodes];
  if (userNode) {
    seeded.unshift({
      ...userNode,
      x: CENTER.x,
      y: CENTER.y,
      vx: 0,
      vy: 0,
      r: radiusFor(userNode),
      homeX: CENTER.x,
      homeY: CENTER.y,
    });
  }
  return seeded;
}

/**
 * CareerBrainGraph — force-directed constellation of the user's skills,
 * target roles and gaps. Pure SVG, imperative rAF physics (no React
 * re-render per tick), draggable nodes, click-to-focus detail panel.
 */
export function CareerBrainGraph({
  snapshot,
}: {
  snapshot: CareerBrainSnapshot;
}) {
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const elRefs = useRef<Map<string, SVGGElement>>(new Map());
  const lineRefs = useRef<Map<string, SVGLineElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef<{ id: string; moved: boolean } | null>(null);
  const settleCountRef = useRef(0);
  const selectedRef = useRef<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [listOpen, setListOpen] = useState(false);

  const rawNodes = useMemo(() => buildGraphNodes(snapshot), [snapshot]);

  useEffect(() => {
    nodesRef.current = seedLayout(rawNodes);
    selectedRef.current = null;
    setSelectedId(null);
    startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawNodes]);

  const applyTransform = useCallback((n: SimNode) => {
    const el = elRefs.current.get(n.id);
    if (el) el.setAttribute("transform", `translate(${n.x}, ${n.y})`);
    const line = lineRefs.current.get(n.id);
    if (line) {
      line.setAttribute("x2", String(n.x));
      line.setAttribute("y2", String(n.y));
    }
  }, []);

  const tick = useCallback(() => {
    const nodes = nodesRef.current;
    const dragging = draggingRef.current;
    let maxV = 0;

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (a.kind === "user") {
        a.x = CENTER.x;
        a.y = CENTER.y;
        applyTransform(a);
        continue;
      }
      if (dragging && dragging.id === a.id) {
        applyTransform(a);
        continue;
      }

      // spring toward home (or center if selected)
      const targetX = selectedRef.current === a.id ? CENTER.x + 90 : a.homeX;
      const targetY = selectedRef.current === a.id ? CENTER.y : a.homeY;
      const k = selectedRef.current === a.id ? 0.045 : 0.018;
      a.vx += (targetX - a.x) * k;
      a.vy += (targetY - a.y) * k;

      // repulsion
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        const minD = a.r + b.r + 18;
        if (d2 < minD * minD && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = ((minD - d) / d) * 0.9;
          a.vx += dx * f * 0.02;
          a.vy += dy * f * 0.02;
        }
      }

      a.vx *= 0.82;
      a.vy *= 0.82;
      a.x += a.vx;
      a.y += a.vy;
      a.x = Math.max(a.r, Math.min(VB_W - a.r, a.x));
      a.y = Math.max(a.r, Math.min(VB_H - a.r, a.y));

      maxV = Math.max(maxV, Math.abs(a.vx), Math.abs(a.vy));
      applyTransform(a);
    }

    if (maxV < 0.05 && !dragging) {
      settleCountRef.current += 1;
    } else {
      settleCountRef.current = 0;
    }

    if (settleCountRef.current > 20) {
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [applyTransform]);

  const startLoop = useCallback(() => {
    settleCountRef.current = 0;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // pause when offscreen
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        startLoop();
      } else if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    });
    io.observe(svg);
    return () => io.disconnect();
  }, [startLoop]);

  const toSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * VB_W;
    const y = ((clientY - rect.top) / rect.height) * VB_H;
    return { x, y };
  }, []);

  const handlePointerDown = (n: SimNode) => (e: ReactPointerEvent<SVGGElement>) => {
    if (n.kind === "user") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = { id: n.id, moved: false };
    startLoop();
  };

  const handlePointerMove = (n: SimNode) => (e: ReactPointerEvent<SVGGElement>) => {
    const d = draggingRef.current;
    if (!d || d.id !== n.id) return;
    d.moved = true;
    const p = toSvgPoint(e.clientX, e.clientY);
    n.x = p.x;
    n.y = p.y;
    n.vx = 0;
    n.vy = 0;
    applyTransform(n);
  };

  const handlePointerUp = (n: SimNode) => (e: ReactPointerEvent<SVGGElement>) => {
    const d = draggingRef.current;
    draggingRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!d?.moved) {
      selectNode(n.id);
    }
    startLoop();
  };

  const selectNode = (id: string) => {
    const next = selectedRef.current === id ? null : id;
    selectedRef.current = next;
    setSelectedId(next);
    startLoop();
  };

  const nodes = nodesRef.current;
  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-elevated/40">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <LegendDot color={KIND_COLOR.skill} label="Skill" />
          <LegendDot color={KIND_COLOR.role} label="Target role" />
          <LegendDot color={KIND_COLOR.gap} label="Gap" hollow />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.15).toFixed(2)))}
            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              selectedRef.current = null;
              setSelectedId(null);
              nodesRef.current = seedLayout(rawNodes);
              startLoop();
            }}
            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Reset graph"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setListOpen((v) => !v)}
            className="ml-2 rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            {listOpen ? "Hide list" : "List view"}
          </button>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="h-[420px] w-full touch-none select-none md:h-[480px]"
          role="img"
          aria-label="Career brain graph: your skills, target roles and gaps"
        >
          <g style={{ transform: `scale(${zoom})`, transformOrigin: "50% 50%" }}>
            {nodesRef.current
              .filter((n) => n.kind !== "user")
              .map((n) => {
                const isCenterUser = nodesRef.current.find((u) => u.kind === "user");
                return (
                  <line
                    key={`link-${n.id}`}
                    ref={(el) => {
                      if (el) lineRefs.current.set(n.id, el);
                      else lineRefs.current.delete(n.id);
                    }}
                    x1={isCenterUser?.x ?? CENTER.x}
                    y1={isCenterUser?.y ?? CENTER.y}
                    x2={n.x}
                    y2={n.y}
                    stroke="var(--color-border)"
                    strokeWidth={0.75}
                    opacity={0.5}
                  />
                );
              })}

            {nodesRef.current.map((n) => (
              <g
                key={n.id}
                ref={(el) => {
                  if (el) elRefs.current.set(n.id, el);
                  else elRefs.current.delete(n.id);
                }}
                transform={`translate(${n.x}, ${n.y})`}
                onPointerDown={handlePointerDown(n)}
                onPointerMove={handlePointerMove(n)}
                onPointerUp={handlePointerUp(n)}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId((v) => (v === n.id ? null : v))}
                className="cursor-pointer"
                tabIndex={-1}
              >
                {n.strength > 0.55 && n.kind !== "gap" && (
                  <circle
                    r={n.r + 6}
                    fill={KIND_COLOR[n.kind]}
                    opacity={0.16 * n.strength}
                  />
                )}
                <circle
                  r={n.r}
                  fill={n.hollow ? "transparent" : KIND_COLOR[n.kind]}
                  fillOpacity={n.hollow ? 0 : n.kind === "skill" ? 0.22 : 0.28}
                  stroke={KIND_COLOR[n.kind]}
                  strokeWidth={selectedId === n.id ? 2.5 : 1.5}
                  strokeDasharray={n.hollow ? "3 3" : undefined}
                />
                <text
                  y={n.r + 14}
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                  style={{
                    fontSize: n.kind === "user" ? 12 : 10,
                    fill: "var(--color-foreground)",
                    fontFamily: "var(--font-mono, monospace)",
                    opacity: hoveredId === n.id || selectedId === n.id || n.kind === "user" ? 1 : 0.72,
                  }}
                >
                  {truncateLabel(n.label)}
                </text>
              </g>
            ))}
          </g>
        </svg>

        <AnimatePresence>
          {selectedNode && (
            <DetailPanel
              node={selectedNode}
              snapshot={snapshot}
              onClose={() => selectNode(selectedNode.id)}
              reduceMotion={!!reduceMotion}
            />
          )}
        </AnimatePresence>
      </div>

      {listOpen && (
        <div className="border-t border-border p-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Keyboard-accessible node list
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-3">
            {rawNodes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => selectNode(n.id)}
                  className={cn(
                    "w-full truncate rounded-md border border-border bg-background px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary/40",
                    selectedId === n.id && "border-primary/60 text-primary",
                  )}
                >
                  <span className="mr-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {KIND_LABEL[n.kind]}
                  </span>
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function truncateLabel(label: string) {
  return label.length > 16 ? `${label.slice(0, 15)}…` : label;
}

function LegendDot({
  color,
  label,
  hollow,
}: {
  color: string;
  label: string;
  hollow?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor: hollow ? "transparent" : color,
          border: `1.5px ${hollow ? "dashed" : "solid"} ${color}`,
        }}
      />
      {label}
    </span>
  );
}

function DetailPanel({
  node,
  snapshot,
  onClose,
  reduceMotion,
}: {
  node: SimNode;
  snapshot: CareerBrainSnapshot;
  onClose: () => void;
  reduceMotion: boolean;
}) {
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: EASE };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={transition}
      className="absolute inset-y-3 right-3 w-[min(320px,calc(100%-1.5rem))] overflow-y-auto rounded-xl border border-border bg-card/95 p-4 shadow-soft backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {KIND_LABEL[node.kind]}
          </p>
          <h3 className="mt-0.5 font-display text-base font-semibold leading-tight">
            {node.label}
          </h3>
          {node.sublabel && (
            <p className="text-xs text-muted-foreground">{node.sublabel}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        {node.kind === "user" && <UserDetail snapshot={snapshot} />}
        {node.kind === "skill" && <SkillDetail node={node} snapshot={snapshot} />}
        {node.kind === "role" && <RoleDetail node={node} snapshot={snapshot} />}
        {node.kind === "gap" && <GapDetail node={node} />}
      </div>
    </motion.div>
  );
}

function UserDetail({ snapshot }: { snapshot: CareerBrainSnapshot }) {
  return (
    <div className="space-y-2">
      <Row label="Title" value={snapshot.identity.currentTitle} />
      <Row label="Location" value={snapshot.identity.location} />
      <Row
        label="Experience"
        value={
          snapshot.identity.yearsOfExperience != null
            ? `${snapshot.identity.yearsOfExperience} yrs`
            : null
        }
      />
      <Row
        label="Completeness"
        value={
          snapshot.metadata.completenessScore != null
            ? `${snapshot.metadata.completenessScore}%`
            : null
        }
      />
      {!snapshot.identity.currentTitle && !snapshot.identity.location && (
        <EmptyState text="Fill in your identity details below to enrich this node." />
      )}
    </div>
  );
}

function SkillDetail({
  node,
  snapshot,
}: {
  node: SimNode;
  snapshot: CareerBrainSnapshot;
}) {
  const skill = node.data.skill as { confidence: number | null; userVerified: boolean };
  const evidence = findSkillEvidence(snapshot, node.label);
  return (
    <div className="space-y-3">
      <Row
        label="Confidence"
        value={skill.confidence != null ? `${skill.confidence}%` : "Unrated"}
      />
      <Row label="Verified" value={skill.userVerified ? "Yes" : "Not yet"} />
      <div>
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Evidence
        </p>
        {evidence.length === 0 ? (
          <EmptyState text="No linked experience or project mentions this skill yet." />
        ) : (
          <ul className="space-y-1.5">
            {evidence.map((e, i) => (
              <li key={i} className="rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs">
                <p className="font-medium">{e.title}</p>
                {e.subtitle && <p className="text-muted-foreground">{e.subtitle}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RoleDetail({
  node,
  snapshot,
}: {
  node: SimNode;
  snapshot: CareerBrainSnapshot;
}) {
  const isPrimary = Boolean(node.data.isPrimary);
  return (
    <div className="space-y-2">
      <Row label="Status" value={isPrimary ? "Primary preference" : "Also considering"} />
      <Row label="Preferred location" value={snapshot.identity.preferences.preferredLocation} />
      <Row label="Expected salary" value={snapshot.identity.preferences.expectedSalary} />
      <EmptyState text="Job-matching data for this role isn't linked here yet — see Job Discovery for live openings." />
    </div>
  );
}

function GapDetail({ node }: { node: SimNode }) {
  const gap = node.data.gap as { source: string };
  return (
    <div className="space-y-2">
      <Row label="Source" value={gap.source} />
      <EmptyState text="No job listings have been matched against this gap yet." />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-right text-[13px]">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
      {text}
    </p>
  );
}
