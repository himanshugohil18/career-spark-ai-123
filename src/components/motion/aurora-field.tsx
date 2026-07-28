import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * AuroraField — slow-drifting ambient gradient mesh.
 * Pure CSS transforms, GPU friendly, decorative only.
 */
export function AuroraField({
  className,
  intensity = 1,
}: {
  className?: string;
  intensity?: number;
}) {
  const blobs = [
    { c: "var(--color-primary, #4F8CFF)", x: ["-12%", "18%", "-12%"], y: ["-8%", "14%", "-8%"], s: 620, d: 26 },
    { c: "var(--color-accent, #22D3EE)", x: ["60%", "32%", "60%"], y: ["10%", "42%", "10%"], s: 520, d: 32 },
    { c: "var(--color-success, #34D399)", x: ["22%", "58%", "22%"], y: ["58%", "24%", "58%"], s: 460, d: 38 },
  ];
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-[110px]"
          style={{
            width: b.s,
            height: b.s,
            background: b.c,
            opacity: 0.14 * intensity,
          }}
          animate={{ left: b.x, top: b.y, scale: [1, 1.12, 1] }}
          transition={{ duration: b.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--color-background)_92%)]" />
    </div>
  );
}
