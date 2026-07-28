import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  pulse: number;
};

/**
 * CareerBrainCanvas — interactive neural constellation.
 * Nodes drift, link to nearby nodes, and lean toward the pointer.
 * Pure canvas: no layout thrash, capped DPR, pauses when offscreen.
 */
export function CareerBrainCanvas({
  className,
  density = 0.00009,
  interactive = true,
}: {
  className?: string;
  density?: number;
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes: Node[] = [];
    let raf = 0;
    let visible = true;
    const pointer = { x: -9999, y: -9999, active: false };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(120, Math.max(28, Math.round(width * height * density)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 0.9 + Math.random() * 1.9,
        hue: 200 + Math.random() * 60,
        pulse: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const linkDist = Math.min(170, Math.max(90, width * 0.13));

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;

        if (pointer.active) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 26000 && d2 > 1) {
            const f = 0.00022;
            n.vx += dx * f;
            n.vy += dy * f;
          }
        }
        n.vx = Math.max(-0.6, Math.min(0.6, n.vx * 0.995));
        n.vy = Math.max(-0.6, Math.min(0.6, n.vy * 0.995));
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > linkDist) continue;
          const alpha = (1 - dist / linkDist) * 0.32;
          ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 90%, 66%, ${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const p = 0.6 + 0.4 * Math.sin(t / 900 + n.pulse);
        const r = n.r * (1 + p * 0.35);
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 6);
        g.addColorStop(0, `hsla(${n.hue}, 95%, 72%, ${0.55 * p + 0.25})`);
        g.addColorStop(1, "hsla(210, 95%, 60%, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `hsla(${n.hue}, 100%, 82%, ${0.75 * p + 0.2})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (t: number) => {
      if (visible) draw(t);
      raf = requestAnimationFrame(loop);
    };

    const onPointer = (e: PointerEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const ro = new ResizeObserver(() => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      build();
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    build();
    if (reduce) {
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [density, interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none h-full w-full", className)}
    />
  );
}
