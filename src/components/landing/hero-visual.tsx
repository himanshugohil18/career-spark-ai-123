import { motion } from "framer-motion";
import { Brain, FileText, Radar, Briefcase, MessagesSquare, GraduationCap } from "lucide-react";

/**
 * HeroVisual — animated AI workspace core with orbiting agent nodes.
 * Ambient, restrained. Never bounces. Apple/Linear/Arc feel.
 */
export function HeroVisual() {
  const nodes = [
    { icon: Brain, angle: 0, label: "Career Brain" },
    { icon: FileText, angle: 60, label: "Resume" },
    { icon: Radar, angle: 120, label: "Discovery" },
    { icon: Briefcase, angle: 180, label: "Applications" },
    { icon: MessagesSquare, angle: 240, label: "Interview" },
    { icon: GraduationCap, angle: 300, label: "Learning" },
  ];
  const radius = 150;

  return (
    <div className="pointer-events-none relative mx-auto mt-16 h-[360px] w-full max-w-[560px] select-none">
      {/* soft radial glow */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #4F8CFF33 0%, #22D3EE18 35%, transparent 70%)",
        }}
      />

      {/* orbit rings */}
      <svg
        viewBox="-200 -200 400 400"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="orbit-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4F8CFF" stopOpacity="0" />
            <stop offset="50%" stopColor="#4F8CFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="0" cy="0" r={radius} fill="none" stroke="url(#orbit-line)" strokeWidth="1" />
          <circle cx="0" cy="0" r={radius - 42} fill="none" stroke="#ffffff08" strokeWidth="1" />
          <circle cx="0" cy="0" r={radius + 32} fill="none" stroke="#ffffff05" strokeWidth="1" />
        </motion.g>

        {/* faint connection spokes */}
        {nodes.map((n) => {
          const rad = (n.angle * Math.PI) / 180;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          return (
            <line
              key={n.label}
              x1="0"
              y1="0"
              x2={x}
              y2={y}
              stroke="#4F8CFF"
              strokeOpacity="0.08"
              strokeDasharray="2 4"
            />
          );
        })}
      </svg>

      {/* central AI core */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{
            background: "var(--gradient-brand-glow)",
            boxShadow: "0 0 60px -10px #4F8CFFaa, inset 0 1px 0 #ffffff30",
          }}
        >
          <Brain className="h-8 w-8 text-primary-foreground" strokeWidth={2} />
          <motion.span
            aria-hidden
            initial={{ opacity: 0.4, scale: 1 }}
            animate={{ opacity: 0, scale: 1.8 }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-2xl border border-primary/60"
          />
        </motion.div>
      </div>

      {/* orbiting nodes */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        {nodes.map((n, i) => {
          const rad = (n.angle * Math.PI) / 180;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          const Icon = n.icon;
          return (
            <motion.div
              key={n.label}
              className="absolute left-1/2 top-1/2"
              style={{ x, y }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* counter-rotate so icons stay upright */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-border bg-elevated/90 text-primary shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] backdrop-blur"
              >
                <Icon className="h-[18px] w-[18px]" />
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-accent/60"
          style={{
            left: `${20 + i * 12}%`,
            top: `${30 + (i % 3) * 20}%`,
          }}
          animate={{ y: [0, -14, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{
            duration: 3 + i * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        />
      ))}
    </div>
  );
}
