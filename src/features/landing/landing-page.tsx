import { motion, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import {
  Sparkles,
  ArrowRight,
  Brain,
  Target,
  FileText,
  MessagesSquare,
  GraduationCap,
  Radar,
  Workflow,
  Check,
  Github,
  Twitter,
  Linkedin,
  BadgeCheck,
  Zap,
  TrendingUp,
  Users,
  Award,
  Upload,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Navbar } from "@/components/landing/navbar";
import { Section, SectionHeading } from "@/components/landing/section";
import { Logo } from "@/components/landing/logo";
import { HeroVisual } from "@/components/landing/hero-visual";
import { ComplianceSections } from "@/components/landing/compliance-sections";
import { AgentStatusPill, type AgentState } from "@/components/ai/agent-status";
import { AIThinking } from "@/components/ai/ai-thinking";
import { cn } from "@/lib/utils";
import { CareerBrainCanvas } from "@/components/motion/career-brain-canvas";
import { ScrollPipeline } from "@/components/motion/scroll-pipeline";
import { SpringNumber } from "@/components/motion/spring-number";
import { Magnetic } from "@/components/motion/burst-button";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicStats, type PublicStats } from "@/lib/stats.functions";

const ease = [0.22, 1, 0.36, 1] as const;

// -----------------------------------------------------------------------------
// Landing page — CareerOS
// -----------------------------------------------------------------------------

function AuthAwareSignInCta() {
  const { isAuthenticated, loading } = useSession();
  if (loading) return null;
  return (
    <Button asChild variant="outline" size="xl" className="backdrop-blur">
      {isAuthenticated ? (
        <Link to="/dashboard">Go to dashboard</Link>
      ) : (
        <Link to="/auth">Sign in</Link>
      )}
    </Button>
  );
}

/** After a Google OAuth round-trip the provider returns to "/" — forward
 *  the now-signed-in user to their dashboard. */
function useOAuthLandingRedirect() {
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuthenticated) return;
    let pending = false;
    try {
      pending = sessionStorage.getItem("careeros:oauth-redirect") === "1";
      if (pending) sessionStorage.removeItem("careeros:oauth-redirect");
    } catch {
      /* ignore */
    }
    if (!pending) return;
    toast.success("Signed in successfully", { description: "Taking you to your dashboard…" });
    navigate({ to: "/dashboard" });
  }, [isAuthenticated, navigate]);
}

export function LandingPage() {
  useOAuthLandingRedirect();
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <AmbientBackdrop />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[110vh] opacity-70">
        <CareerBrainCanvas />
      </div>
      <Navbar />
      <main className="relative pt-16">

        <Hero />
        <LogoMarquee />

        <Preview />
        <ScrollPipeline />
        <WorkflowTimeline />

        <Features />
        <AgentNetwork />
        <CareerBrainViz />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
        <ComplianceSections />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

// ---------- Global ambient backdrop ----------

function AmbientBackdrop() {
  const spotRef = useRef<HTMLDivElement | null>(null);
  const { scrollY } = useScroll();
  const driftY1 = useTransform(scrollY, [0, 3000], [0, -260]);
  const driftY2 = useTransform(scrollY, [0, 3000], [0, 160]);
  const driftY3 = useTransform(scrollY, [0, 3000], [0, -120]);
  const hueShift = useTransform(scrollY, [0, 4000], [0, 40]);
  const hueFilter = useTransform(hueShift, (h) => `hue-rotate(${h}deg)`);

  useEffect(() => {
    let raf = 0;
    let tx = 50, ty = 30, cx = 50, cy = 30;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 100;
      ty = (e.clientY / window.innerHeight) * 100;
    };
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      if (spotRef.current) {
        spotRef.current.style.background = `radial-gradient(600px circle at ${cx}% ${cy}%, rgba(79,140,255,0.14), rgba(34,211,238,0.06) 35%, transparent 65%)`;
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-aurora animate-aurora absolute inset-0 opacity-70" />
      <motion.div
        style={{ y: driftY1, filter: hueFilter }}
        className="animate-drift-a absolute -left-[10%] top-[8%] h-[520px] w-[520px] rounded-full opacity-40 blur-3xl will-change-transform"
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, #4F8CFF66 0%, transparent 70%)" }} />
      </motion.div>
      <motion.div
        style={{ y: driftY2 }}
        className="animate-drift-b absolute right-[-8%] top-[30%] h-[460px] w-[460px] rounded-full opacity-35 blur-3xl will-change-transform"
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, #22D3EE55 0%, transparent 70%)" }} />
      </motion.div>
      <motion.div
        style={{ y: driftY3 }}
        className="animate-drift-c absolute left-[30%] bottom-[-10%] h-[600px] w-[600px] rounded-full opacity-30 blur-3xl will-change-transform"
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, #7C5CFF55 0%, transparent 70%)" }} />
      </motion.div>
      <div className="bg-grid grid-fade-mask animate-grid-pulse absolute inset-0 opacity-60" />
      <div className="absolute inset-0 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-streak absolute h-[2px] w-[40%] rounded-full blur-sm"
            style={{
              top: `${20 + i * 25}%`,
              background: "linear-gradient(90deg, transparent, #4F8CFFaa, transparent)",
              animationDelay: `${i * 4.5}s`,
            }}
          />
        ))}
      </div>
      <div ref={spotRef} className="absolute inset-0" />
      <div className="bg-noise absolute inset-0 opacity-[0.05] mix-blend-overlay" />
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="animate-twinkle absolute rounded-full bg-white"
          style={{
            width: i % 6 === 0 ? 2 : 1,
            height: i % 6 === 0 ? 2 : 1,
            left: `${(i * 137) % 100}%`,
            top: `${(i * 53) % 100}%`,
            animationDelay: `${(i % 8) * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

// ---------- Section atmosphere presets ----------

function SectionAtmosphere({
  variant,
}: {
  variant: "blueprint" | "neural" | "orbit" | "spotlight" | "particles" | "mesh";
}) {
  if (variant === "blueprint") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #4F8CFF22 1px, transparent 1px), linear-gradient(to bottom, #4F8CFF22 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 80%)",
          }}
        />
        <div
          className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #4F8CFF33, transparent 70%)" }}
        />
      </div>
    );
  }
  if (variant === "neural") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <svg className="absolute inset-0 h-full w-full opacity-[0.14]" preserveAspectRatio="none">
          <defs>
            <pattern id="neural-dots" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <circle cx="40" cy="40" r="1.2" fill="#22D3EE" />
              <line x1="40" y1="40" x2="120" y2="40" stroke="#22D3EE" strokeWidth="0.3" strokeDasharray="2 6" />
              <line x1="40" y1="40" x2="40" y2="120" stroke="#22D3EE" strokeWidth="0.3" strokeDasharray="2 6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural-dots)" />
        </svg>
        <div
          className="animate-drift-a absolute -left-[10%] top-[20%] h-[400px] w-[400px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #22D3EE44, transparent 70%)" }}
        />
        <div
          className="animate-drift-c absolute right-[-8%] bottom-[10%] h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #7C5CFF44, transparent 70%)" }}
        />
      </div>
    );
  }
  if (variant === "orbit") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {[1, 2, 3].map((r) => (
            <motion.div
              key={r}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10"
              style={{ width: 320 * r, height: 320 * r }}
              animate={{ rotate: r % 2 === 0 ? -360 : 360 }}
              transition={{ duration: 50 * r, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </div>
        <div
          className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #4F8CFF55, transparent 70%)" }}
        />
      </div>
    );
  }
  if (variant === "spotlight") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute left-1/2 top-0 h-[700px] w-[900px] -translate-x-1/2 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, #4F8CFF33 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #22D3EE33, transparent 70%)" }}
        />
        <div className="bg-grid grid-fade-mask absolute inset-0 opacity-30" />
      </div>
    );
  }
  if (variant === "particles") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full"
            style={{
              left: `${(i * 71) % 100}%`,
              top: `${(i * 43) % 100}%`,
              background: i % 2 ? "#22D3EE" : "#4F8CFF",
              boxShadow: i % 2 ? "0 0 10px #22D3EEaa" : "0 0 10px #4F8CFFaa",
            }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }}
            transition={{
              duration: 4 + (i % 5) * 0.7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i % 6) * 0.3,
            }}
          />
        ))}
        <div
          className="animate-drift-b absolute left-[20%] top-[20%] h-[380px] w-[380px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #7C5CFF55, transparent 70%)" }}
        />
      </div>
    );
  }
  // mesh
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="bg-aurora animate-aurora absolute inset-0 opacity-60" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, #4F8CFF33 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, #22D3EE33 0%, transparent 60%)",
        }}
      />
    </div>
  );
}

// ---------- Hero ----------

function Hero() {
  const wrap = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 });
  const smy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 });
  const orbX = useTransform(smx, (v) => v * 24);
  const orbY = useTransform(smy, (v) => v * 20);
  const glassX = useTransform(smx, (v) => v * -14);
  const glassY = useTransform(smy, (v) => v * -10);

  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 500], [0, 60]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width - 0.5);
      my.set((e.clientY - r.top) / r.height - 0.5);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  return (
    <section ref={wrap} className="relative overflow-hidden">
      <motion.div aria-hidden style={{ y: parallaxY }} className="absolute inset-0 -z-10">
        <div className="bg-live-mesh animate-live-mesh absolute inset-0" />
        <div className="bg-aurora animate-aurora absolute inset-0 opacity-90 mix-blend-screen" />
        <div className="absolute inset-0 opacity-60 mix-blend-screen" style={{ backgroundImage: "var(--gradient-hero)" }} />
        <div className="bg-grid grid-fade-mask absolute inset-0 opacity-40" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </motion.div>

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 flex items-start justify-center">
        <div
          className="animate-beam relative mt-[-10rem] h-[900px] w-[900px] rounded-full opacity-40"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, transparent 0deg, #4F8CFF33 40deg, transparent 90deg, #22D3EE22 200deg, transparent 260deg, #7C5CFF33 320deg, transparent 360deg)",
            mask: "radial-gradient(circle, black 30%, transparent 70%)",
            WebkitMask: "radial-gradient(circle, black 30%, transparent 70%)",
          }}
        />
      </div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 0.6, scale: 1 }}
        transition={{ duration: 1.4, ease }}
        style={{ x: orbX, y: orbY, background: "var(--gradient-brand-glow)" }}
        className="pointer-events-none absolute left-1/2 top-[38%] -z-10 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
      />

      <motion.div aria-hidden style={{ x: glassX, y: glassY }} className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float absolute left-[8%] top-[28%] h-40 w-40 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl" />
        <div className="animate-float absolute right-[10%] top-[20%] h-28 w-28 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-lg [animation-delay:1.2s]" />
        <div className="animate-float absolute left-[18%] bottom-[18%] h-24 w-24 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-lg [animation-delay:0.6s]" />
      </motion.div>

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {[...Array(14)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full"
            style={{
              left: `${(i * 71) % 100}%`,
              top: `${20 + ((i * 37) % 60)}%`,
              background: i % 2 ? "#22D3EE" : "#4F8CFF",
              boxShadow: i % 2 ? "0 0 8px #22D3EEaa" : "0 0 8px #4F8CFFaa",
            }}
            animate={{ y: [0, -22, 0], opacity: [0.15, 0.75, 0.15] }}
            transition={{
              duration: 4 + (i % 5) * 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i % 6) * 0.35,
            }}
          />
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-6 pb-20 pt-20 text-center md:px-10 md:pb-28 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="group relative inline-flex items-center gap-2 rounded-full border border-border/70 bg-elevated/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          CareerOS · AI-powered career management platform
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.65, delay: 0.1, ease }}
          className="mt-8 max-w-4xl font-display text-[42px] font-semibold leading-[1.05] tracking-tight md:text-7xl md:leading-[1.02]"
        >
          <span className="text-gradient-brand">CareerOS</span>{" "}
          — your career,{" "}
          <span className="italic text-foreground/90">run by intelligent agents.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
        >
          CareerOS is an AI career operating system that helps professionals
          build resumes, discover jobs across LinkedIn, Indeed, Naukri and
          Wellfound, auto-apply, tailor cover letters, and prep for interviews —
          all in one secure workspace.
        </motion.p>


        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Magnetic strength={8}>
            <div className="group relative">
              <span className="absolute -inset-0.5 rounded-lg bg-[image:var(--gradient-brand-glow)] opacity-60 blur transition duration-500 group-hover:opacity-100" />
              <Button asChild variant="primary" size="xl" className="relative">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start your Career Brain
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </Magnetic>

          <Button asChild variant="outline" size="xl" className="backdrop-blur">
            <a href="#preview">Watch demo</a>
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.85 }}
          className="mt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground"
        >
          Free to start · No credit card required
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease }}
          className="w-full"
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  );
}

// ---------- Logo marquee (replaces static social proof) ----------

function LogoMarquee() {
  const logos = ["stripe", "linear", "vercel", "notion", "figma", "openai", "anthropic", "supabase", "framer", "arc"];
  const row = [...logos, ...logos];
  return (
    <section className="relative border-y border-border/60 bg-surface-2/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-6 py-10 md:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Trusted by ambitious professionals from
        </p>
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <motion.div
            className="flex gap-14 whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          >
            {row.map((l, i) => (
              <span
                key={`${l}-${i}`}
                className="font-display text-xl font-semibold uppercase tracking-wide text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                {l}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ---------- Stats (real, live values from database) ----------

function Stats() {
  const fetchStats = useServerFn(getPublicStats);
  const { data, isLoading } = useQuery({
    queryKey: ["public-stats"],
    queryFn: () => fetchStats(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Hide entirely while loading OR when nothing has been created yet.
  const total = data
    ? data.users + data.jobs + data.applications + data.ai_sessions + data.resumes + data.companies
    : 0;
  if (isLoading || !data || total === 0) return null;

  const cells: {
    label: string; value: number; icon: typeof Radar; color: string;
  }[] = [
    { label: "Registered users",       value: data.users,        icon: Users,          color: "#4F8CFF" },
    { label: "Jobs discovered",        value: data.jobs,         icon: Radar,          color: "#22D3EE" },
    { label: "Applications prepared",  value: data.applications, icon: Send,           color: "#7C5CFF" },
    { label: "AI sessions run",        value: data.ai_sessions,  icon: Sparkles,       color: "#22C55E" },
    { label: "Resumes optimized",      value: data.resumes,      icon: FileText,       color: "#4F8CFF" },
    { label: "Companies indexed",      value: data.companies,    icon: Award,          color: "#22D3EE" },
  ].filter((c) => c.value > 0);

  if (cells.length === 0) return null;
  // Cap to 4 to keep layout balanced
  const visible = cells.slice(0, 4);

  return (
    <section className="relative py-20 md:py-24">
      <SectionAtmosphere variant="mesh" />
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10">
        <div className="mb-8 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Live metrics</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Running on real signal, updated in real time
          </h2>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-elevated/40 p-8 backdrop-blur-xl md:p-12">
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
            <motion.span
              className="block h-full w-1/3 bg-[image:var(--gradient-brand-glow)]"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
          </span>
          <div
            className={cn(
              "grid gap-8",
              visible.length === 2 && "sm:grid-cols-2",
              visible.length === 3 && "sm:grid-cols-3",
              visible.length >= 4 && "sm:grid-cols-2 md:grid-cols-4",
            )}
          >
            {visible.map((s, i) => (
              <StatCell key={s.label} {...s} delay={i * 0.08} />
            ))}
          </div>
          <p className="relative mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Live from the CareerOS database · refreshed automatically
          </p>
        </div>
      </div>
    </section>
  );
}

function StatCell({
  label, value, icon: Icon, color, delay,
}: { label: string; value: number; icon: typeof Radar; color: string; delay: number }) {
  const n = useCountUp(value, 1.6);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, ease }}
      className="group relative"
    >
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-elevated" style={{ color }}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-display text-4xl font-semibold tabular-nums text-foreground md:text-5xl" style={{ textShadow: `0 0 40px ${color}44` }}>
        {n.toLocaleString()}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
}

// ---------- Product Preview ----------

function Preview() {
  return (
    <Section id="preview" className="py-20 md:py-24">
      <SectionAtmosphere variant="blueprint" />
      <SectionHeading
        eyebrow="The Workspace"
        title="A command center for your career"
        description="Not a dashboard of vanity metrics. A living workspace where AI agents surface what matters today, and quietly work in the background."
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease }}
        className="relative mx-auto max-w-6xl"
      >
        <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-[image:var(--gradient-brand-glow)] opacity-25 blur-3xl" />

        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-elevated/70 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
            <motion.span
              className="block h-full w-1/3 bg-[image:var(--gradient-brand-glow)]"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <div className="flex items-center gap-2 border-b border-border bg-surface-2/70 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3A3A3A]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#3A3A3A]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#3A3A3A]" />
            </div>
            <div className="mx-auto font-mono text-[11px] text-muted-foreground">
              careeros · workspace
            </div>
          </div>

          <div className="grid grid-cols-12 gap-0">
            <div className="col-span-3 hidden border-r border-border bg-surface-2/60 p-5 md:block">
              <div className="mb-6 flex items-center gap-2">
                <Logo size={22} />
                <span className="font-display text-sm font-semibold">CareerOS</span>
              </div>
              {["Dashboard","Career Brain","Jobs","Applications","Interview","Coach"].map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    "mb-1 rounded-md px-3 py-2 text-[13px] transition-colors",
                    i === 0 ? "bg-elevated text-foreground ring-1 ring-primary/20" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="col-span-12 space-y-4 p-6 md:col-span-9 md:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Good morning
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-semibold">
                    Here's your focus for today
                  </h3>
                </div>
                <div className="hidden md:block">
                  <AIThinking
                    size="sm"
                    steps={[
                      "⚡  Scanning new opportunities…",
                      "✨  Ranking matches for you…",
                      "🧠  Updating Career Brain…",
                    ]}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <PreviewCard label="Career Health" value={82} suffix="" hint="+6 this week" accent="success" />
                <PreviewCard label="Match rate" value={94} suffix="%" hint="12 new roles" accent="accent" />
                <PreviewCard label="Active applications" value={7} suffix="" hint="2 need follow-up" accent="primary" />
              </div>

              <LiveRecommendation />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </Section>
  );
}

const RECS = [
  "You're a strong match for 3 roles at growth-stage AI startups. I can tailor your resume for the strongest lead and draft a personal cover letter in under a minute.",
  "A Series-B fintech just posted a Staff Engineer role that maps to 92% of your Career Brain. Want me to prepare the application?",
  "Your interview signal for system-design rounds is trending up. I can run a targeted mock on distributed systems before Thursday.",
];

function LiveRecommendation() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % RECS.length), 5200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-5">
      <div className="pointer-events-none absolute -inset-px rounded-lg opacity-40" style={{ background: "radial-gradient(400px 80px at 20% 0%, #4F8CFF22, transparent 70%)" }} />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Career Agent · recommendation
          </span>
        </div>
        <div className="relative min-h-[76px]">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease }}
            className="text-[15px] leading-relaxed text-foreground"
          >
            {RECS[i]}
          </motion.p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="primary" size="sm">Show matches</Button>
          <Button variant="ghost" size="sm">Later</Button>
        </div>
      </div>
    </div>
  );
}

function useCountUp(target: number, duration = 1.2) {
  const [v, setV] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function Sparkline({ color = "#4F8CFF" }: { color?: string }) {
  const points = [8, 14, 10, 18, 16, 22, 20, 28, 26, 34];
  const w = 100; const h = 30;
  const max = Math.max(...points);
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - (p / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-6 w-full">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={d} />
      <polygon points={`0,${h} ${d} ${w},${h}`} fill={`url(#spark-${color})`} />
    </svg>
  );
}

function PreviewCard({ label, value, suffix, hint, accent }: {
  label: string; value: number; suffix: string; hint: string; accent: "primary" | "accent" | "success";
}) {
  const color = accent === "primary" ? "text-primary" : accent === "accent" ? "text-accent" : "text-success";
  const stroke = accent === "primary" ? "#4F8CFF" : accent === "accent" ? "#22D3EE" : "#22C55E";
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-[0_0_40px_-16px_var(--tw-shadow-color)]"
      style={{ ["--tw-shadow-color" as any]: stroke }}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-display text-3xl font-semibold tabular-nums", color)}>
        <SpringNumber value={value} suffix={suffix} />
      </p>

      <Sparkline color={stroke} />
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </motion.div>
  );
}

// ---------- Workflow Timeline (NEW) ----------

const FLOW = [
  { icon: Upload, label: "Upload Resume", color: "#4F8CFF" },
  { icon: Brain, label: "Career Brain", color: "#7C5CFF" },
  { icon: Radar, label: "Job Discovery", color: "#22D3EE" },
  { icon: FileText, label: "AI Resume", color: "#4F8CFF" },
  { icon: Send, label: "AI Apply", color: "#22D3EE" },
  { icon: MessagesSquare, label: "Interview", color: "#22C55E" },
];

function WorkflowTimeline() {
  return (
    <section className="relative py-20 md:py-24">
      <SectionAtmosphere variant="mesh" />
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10">
        <SectionHeading
          eyebrow="The Workflow"
          title="From upload to offer — one continuous flow"
          description="Every step is handled by a specialized agent. Watch the signal travel through your career pipeline."
        />
        <div className="relative">
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute top-1/2 hidden h-2 w-2 -translate-y-1/2 rounded-full bg-[image:var(--gradient-brand-glow)] md:block"
            style={{ boxShadow: "0 0 20px #4F8CFFdd", filter: "blur(1px)" }}
            animate={{ left: ["0%", "100%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative grid gap-6 md:grid-cols-6 md:gap-3">
            {FLOW.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08, ease }}
                className="group relative flex flex-col items-center text-center"
              >
                <div
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-elevated/80 backdrop-blur-md transition-transform group-hover:-translate-y-1"
                  style={{ color: f.color, boxShadow: `0 0 30px -8px ${f.color}66` }}
                >
                  <span
                    className="absolute inset-0 rounded-2xl opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-60"
                    style={{ background: f.color }}
                  />
                  <f.icon className="relative h-5 w-5" />
                  <span
                    className="absolute -inset-1 rounded-2xl border opacity-40"
                    style={{ borderColor: `${f.color}44` }}
                  />
                </div>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Step {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 font-display text-sm font-semibold text-foreground">{f.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Features ----------

const FEATURES = [
  { icon: Brain, title: "Career Brain", body: "A structured, always-current model of your skills, experience, and goals — the ground truth every agent works from." },
  { icon: Radar, title: "Signal-driven discovery", body: "Continuous scanning of opportunities that match your trajectory, not keyword soup." },
  { icon: FileText, title: "Resume intelligence", body: "Understands your resume like a hiring manager. Tailors it per role with reasoning you can inspect." },
  { icon: MessagesSquare, title: "Interview preparation", body: "Adaptive mock interviews per company, per role, per level. Feedback grounded in real signal." },
  { icon: Workflow, title: "Application automation", body: "Repetitive submission work handled for you. You stay in control of the message." },
  { icon: GraduationCap, title: "Learning paths", body: "Personalized skill roadmaps derived from your target roles and current gaps." },
];

function Features() {
  return (
    <Section id="features" className="py-20 md:py-24">
      <SectionAtmosphere variant="neural" />
      <SectionHeading
        eyebrow="Capabilities"
        title="Built to actually run your career"
        description="Every feature is grounded in your Career Brain — no generic advice, no vanity outputs."
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} f={f} i={i} />
        ))}
      </div>
    </Section>
  );
}

function FeatureCard({ f, i }: { f: typeof FEATURES[number]; i: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: i * 0.05, ease }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(300px circle at var(--mx,50%) var(--my,50%), rgba(79,140,255,0.18), transparent 40%)" }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-elevated text-primary transition-colors group-hover:border-primary/40 group-hover:text-accent">
        <span className="absolute inset-0 rounded-xl bg-[image:var(--gradient-brand-glow)] opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40" />
        <f.icon className="relative h-5 w-5" />
      </div>
      <h3 className="relative font-display text-lg font-semibold">{f.title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
    </motion.div>
  );
}

// ---------- Agent Network (NEW visualization of agents) ----------

type LiveAgent = {
  name: string; role: string; state: AgentState; activity: string; icon: typeof Brain;
};

const AGENTS: LiveAgent[] = [
  { name: "Resume Agent", role: "Structures & optimizes your resume", state: "ready", activity: "Analyzing structure…", icon: FileText },
  { name: "Career Brain", role: "Maintains your Career Brain", state: "active", activity: "Thinking…", icon: Brain },
  { name: "Discovery Agent", role: "Discovers matched opportunities", state: "active", activity: "Searching…", icon: Radar },
  { name: "Application Agent", role: "Prepares and submits applications", state: "standby", activity: "Preparing…", icon: Workflow },
  { name: "Interview Agent", role: "Adaptive mock interviews", state: "ready", activity: "Processing…", icon: MessagesSquare },
  { name: "Coach Agent", role: "Long-term career strategy", state: "ready", activity: "Preparing…", icon: GraduationCap },
];

function AgentNetwork() {
  return (
    <Section id="agents" className="py-20 md:py-24">
      <SectionAtmosphere variant="orbit" />
      <SectionHeading
        eyebrow="Agents"
        title="Specialized, not generic"
        description="A team of focused AI agents — each with a defined responsibility, all sharing one structured view of you."
      />

      {/* Central visualization */}
      <div className="relative mx-auto mb-16 hidden h-[340px] w-full max-w-3xl md:block">
        <svg viewBox="-200 -170 400 340" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="net-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4F8CFF" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#4F8CFF" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {AGENTS.map((_, i) => {
            const angle = (i / AGENTS.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * 140;
            const y = Math.sin(angle) * 120;
            return (
              <g key={i}>
                <line x1="0" y1="0" x2={x} y2={y} stroke="url(#net-line)" strokeWidth="0.8" />
                <motion.circle
                  cx="0" cy="0" r="2" fill="#22D3EE"
                  animate={{ cx: [0, x], cy: [0, y], opacity: [0, 1, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
                />
              </g>
            );
          })}
        </svg>
        {/* central core */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            className="relative flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "var(--gradient-brand-glow)", boxShadow: "0 0 50px -8px #4F8CFFaa" }}
          >
            <Brain className="h-7 w-7 text-primary-foreground" />
          </motion.div>
        </div>
        {/* orbiting agent chips */}
        {AGENTS.map((a, i) => {
          const angle = (i / AGENTS.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * 175;
          const y = Math.sin(angle) * 145;
          return (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, scale: 0.7 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * i, ease }}
              className="absolute left-1/2 top-1/2"
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-elevated/90 text-primary shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] backdrop-blur">
                <a.icon className="h-4 w-4" />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05, ease }}
            whileHover={{ y: -3 }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-md transition-colors hover:border-primary/40"
          >
            {a.state === "active" && (
              <span aria-hidden className="pointer-events-none absolute right-4 top-4 flex h-2.5 w-2.5">
                <span
                  className="absolute inline-flex h-full w-full rounded-full bg-success/70"
                  style={{ animation: "pulse-ring 1.6s cubic-bezier(0,0,0.2,1) infinite" }}
                />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_10px_#22C55Eaa]" />
              </span>
            )}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-elevated text-primary">
                  <span className="absolute inset-0 rounded-xl bg-[image:var(--gradient-brand-glow)] opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40" />
                  <a.icon className="relative h-4 w-4" />
                </div>
                <div>
                  <p className="font-display text-[15px] font-semibold">{a.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.role}</p>
                </div>
              </div>
              <AgentStatusPill state={a.state} />
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-md border border-border/70 bg-surface-2/60 px-3 py-2 font-mono text-[11px] text-muted-foreground">
              <ThinkingDots />
              <span className="truncate">{a.activity}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2/60">
              <span
                className="block h-full w-1/3 rounded-full bg-[image:var(--gradient-brand-glow)]"
                style={{ animation: "progress-indeterminate 2.4s ease-in-out infinite" }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1 w-1 rounded-full bg-accent"
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

// ---------- Career Brain Visualization (NEW) ----------

const BRAIN_ORBITS = [
  { r: 130, speed: 30, items: [
    { label: "React", color: "#22D3EE" },
    { label: "TypeScript", color: "#4F8CFF" },
    { label: "Systems Design", color: "#7C5CFF" },
    { label: "Leadership", color: "#22C55E" },
  ]},
  { r: 200, speed: 45, items: [
    { label: "Product Strategy", color: "#22D3EE" },
    { label: "AI/ML", color: "#4F8CFF" },
    { label: "Distributed Systems", color: "#7C5CFF" },
    { label: "Mentoring", color: "#22C55E" },
    { label: "Postgres", color: "#4F8CFF" },
  ]},
];

function CareerBrainViz() {
  return (
    <section className="relative py-20 md:py-24">
      <SectionAtmosphere variant="particles" />
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              The Career Brain
            </span>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              A living model of <span className="text-gradient-brand">who you are</span> professionally.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Skills, experience, goals, projects, and technologies — all structured,
              versioned, and always current. Every agent works from the same source of truth.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Continuously updated as you grow",
                "Explainable — inspect every inference",
                "Portable — export anytime, own your data",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto h-[440px] w-full max-w-[520px]">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full opacity-60 blur-3xl"
              style={{ background: "radial-gradient(circle at 50% 50%, #4F8CFF44 0%, #22D3EE22 40%, transparent 70%)" }}
            />
            {/* core */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: "var(--gradient-brand-glow)", boxShadow: "0 0 80px -10px #4F8CFFcc" }}
              >
                <Brain className="h-10 w-10 text-primary-foreground" />
                <motion.span
                  className="absolute inset-0 rounded-full border border-primary/60"
                  initial={{ opacity: 0.5, scale: 1 }}
                  animate={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
                />
              </motion.div>
            </div>

            {/* orbits */}
            {BRAIN_ORBITS.map((orbit, oi) => (
              <div key={oi} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  className="rounded-full border border-white/5"
                  style={{ width: orbit.r * 2, height: orbit.r * 2 }}
                  animate={{ rotate: oi % 2 ? -360 : 360 }}
                  transition={{ duration: orbit.speed, repeat: Infinity, ease: "linear" }}
                >
                  {orbit.items.map((it, i) => {
                    const angle = (i / orbit.items.length) * Math.PI * 2;
                    const x = Math.cos(angle) * orbit.r;
                    const y = Math.sin(angle) * orbit.r;
                    return (
                      <motion.div
                        key={it.label}
                        className="absolute left-1/2 top-1/2"
                        style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                        animate={{ rotate: oi % 2 ? 360 : -360 }}
                        transition={{ duration: orbit.speed, repeat: Infinity, ease: "linear" }}
                      >
                        <span
                          className="whitespace-nowrap rounded-full border border-white/10 bg-elevated/90 px-3 py-1 text-[11px] font-medium backdrop-blur"
                          style={{ color: it.color, boxShadow: `0 0 20px -6px ${it.color}88` }}
                        >
                          {it.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- How It Works ----------

const STEPS = [
  { title: "Create your account", body: "Sign up with Google or email in seconds.", icon: Sparkles },
  { title: "Upload your resume", body: "We parse it into a structured Career Brain.", icon: FileText },
  { title: "Meet your agents", body: "Each agent introduces itself and its role.", icon: Brain },
  { title: "Discover matched roles", body: "Real opportunities ranked by fit.", icon: Radar },
  { title: "Tailor & apply", body: "One-click resume + cover letter tailored per role.", icon: Workflow },
  { title: "Prepare & grow", body: "Interview practice and learning paths, always current.", icon: GraduationCap },
];

function HowItWorks() {
  return (
    <Section id="how" className="py-20 md:py-24">
      <SectionAtmosphere variant="mesh" />
      <SectionHeading eyebrow="How it works" title="From resume to offer, in one workspace" />
      <div className="relative mx-auto max-w-4xl">
        <div aria-hidden className="absolute left-[23px] top-2 bottom-2 hidden w-px bg-gradient-to-b from-primary/70 via-accent/40 to-transparent md:block" />
        <motion.div
          aria-hidden
          className="absolute left-[19px] top-0 hidden h-6 w-2 rounded-full bg-[image:var(--gradient-brand-glow)] md:block"
          animate={{ y: ["0%", "1200%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{ filter: "blur(4px)", opacity: 0.6 }}
        />
        <ol className="space-y-6">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06, ease }}
              className="group relative flex gap-5"
            >
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-elevated text-primary transition-colors group-hover:border-primary/50">
                <span className="absolute inset-0 rounded-xl bg-[image:var(--gradient-brand-glow)] opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40" />
                <s.icon className="relative h-4 w-4" />
                <span className="absolute -bottom-2 -right-2 rounded-full border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="pt-1.5">
                <h4 className="font-display text-lg font-semibold">{s.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

// ---------- Pricing (redesigned with glass panel + spotlight) ----------

const PLANS = [
  { name: "Free", price: "$0", tag: "Get started", features: ["Career Brain (basic)","Resume intelligence","10 job matches / month","5 tailored applications"], cta: "Start free", highlighted: false },
  { name: "Pro", price: "$19", tag: "For serious job seekers", features: ["Unlimited Career Brain","Unlimited job discovery","Unlimited tailored applications","Full interview preparation","Coach agent access"], cta: "Go Pro", highlighted: true },
  { name: "Enterprise", price: "Custom", tag: "Teams & orgs", features: ["SSO / SAML","Team analytics","Recruiter CRM","Priority support","Custom agents"], cta: "Contact sales", highlighted: false },
];

function Pricing() {
  return (
    <section id="pricing" className="relative py-20 md:py-24">
      <SectionAtmosphere variant="spotlight" />
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple, credit-based, transparent"
          description="Start free. Upgrade when you're ready to move faster."
        />

        <div className="relative">
          {/* Glass container */}
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-elevated/30 p-6 backdrop-blur-2xl md:p-10">
            {/* moving hairline */}
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
              <motion.span
                className="block h-full w-1/3 bg-[image:var(--gradient-brand-glow)]"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
            </span>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{ background: "radial-gradient(600px 240px at 50% 0%, #4F8CFF33, transparent 70%)" }}
            />

            <div className="relative grid items-stretch gap-5 lg:grid-cols-3">
              {PLANS.map((p, i) => (
                <PlanCard key={p.name} p={p} i={i} />
              ))}
            </div>

            <p className="relative mt-8 text-center text-xs text-muted-foreground">
              All plans include RLS-secured data, export anytime, and cancel with one click.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanCard({ p, i }: { p: typeof PLANS[number]; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: i * 0.05, ease }}
      whileHover={{ y: -4 }}
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-2xl border p-7 backdrop-blur-md",
        p.highlighted
          ? "border-primary/50 bg-gradient-to-b from-primary/[0.10] via-accent/[0.04] to-transparent shadow-[0_0_80px_-20px_#4F8CFF66]"
          : "border-border bg-card/60",
      )}
    >
      {p.highlighted && (
        <>
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[image:var(--gradient-primary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground shadow-[0_0_20px_#4F8CFF88]">
            Most popular
          </span>
          <span aria-hidden className="pointer-events-none absolute inset-0 opacity-30" style={{ background: "radial-gradient(500px 200px at 50% 0%, #4F8CFF33, transparent 70%)" }} />
        </>
      )}
      {/* Header — aligned across all three cards */}
      <div className="relative min-h-[128px]">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{p.tag}</p>
        <h3 className="mt-3 font-display text-2xl font-semibold">{p.name}</h3>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="font-display text-5xl font-semibold">{p.price}</span>
          {p.price.startsWith("$") && p.price !== "$0" ? (
            <span className="text-sm text-muted-foreground">/month</span>
          ) : null}
        </div>
      </div>

      <div className="relative my-5 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      <ul className="relative flex-1 space-y-3">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span className="text-foreground/90">{f}</span>
          </li>
        ))}
      </ul>

      <Button asChild variant={p.highlighted ? "primary" : "outline"} size="lg" className="relative mt-7">
        <Link to="/auth" search={{ mode: "signup" }}>{p.cta}</Link>
      </Button>
    </motion.div>
  );
}

// ---------- Testimonials ----------

const QUOTES = [
  { quote: "CareerOS feels like having a career team on demand. The Career Brain concept is genuinely new — nothing else works like this.", name: "Amara Okafor", role: "Staff Engineer", company: "Fintech" },
  { quote: "I stopped tailoring resumes manually. The agent does it better than I did, and I get to see the reasoning.", name: "Jonas Weber", role: "Product Designer", company: "SaaS" },
  { quote: "The interview agent surfaced blind spots I didn't know I had. Landed a role two weeks later.", name: "Priya Raman", role: "Data Scientist", company: "Health tech" },
];

function Testimonials() {
  return (
    <Section className="py-20 md:py-24">
      <SectionAtmosphere variant="particles" />
      <SectionHeading eyebrow="Signal from users" title="Built with people who take their careers seriously" />
      <div className="grid gap-5 md:grid-cols-3">
        {QUOTES.map((q, i) => (
          <motion.figure
            key={q.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06, ease }}
            whileHover={{ y: -3 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/60 p-6 backdrop-blur-xl transition-colors hover:border-primary/40"
          >
            <span aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[image:var(--gradient-brand-glow)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30" />
            <blockquote className="relative text-[15px] leading-relaxed text-foreground/90">"{q.quote}"</blockquote>
            <figcaption className="relative mt-6 flex items-center gap-3">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-[image:var(--gradient-brand-glow)] opacity-50 blur-md" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[image:var(--gradient-brand-glow)] font-display text-sm font-semibold text-primary-foreground">
                  {q.name.split(" ").map((n) => n[0]).join("")}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-sm font-medium">
                  <span className="truncate">{q.name}</span>
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
                </p>
                <p className="text-xs text-muted-foreground">{q.role} · {q.company}</p>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </Section>
  );
}

// ---------- FAQ ----------

const FAQS = [
  { q: "Is CareerOS a job board?", a: "No. CareerOS is an AI-native workspace for your entire career. Job discovery is one of several capabilities powered by your Career Brain." },
  { q: "Where does my data live?", a: "Your resume, profile, and Career Brain are stored securely with row-level security. You can export or delete everything at any time." },
  { q: "Which AI models do you use?", a: "Specialized agents run on our AI gateway. We route to the best model per task and continuously evaluate quality." },
  { q: "Do you auto-apply for me?", a: "Only when you explicitly ask. You always stay in control of the message and the timing." },
  { q: "Is there a free plan?", a: "Yes — the Free plan is generous enough to build your Career Brain and get meaningful matches." },
];

function FAQ() {
  return (
    <Section id="faq" className="py-20 md:py-24">
      <SectionAtmosphere variant="mesh" />
      <SectionHeading eyebrow="FAQ" title="Everything you'd want to ask" />
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-elevated/30 px-6 backdrop-blur-xl md:px-8">
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="py-5 text-left text-[15px] font-medium hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}

// ---------- CTA ----------

function CTA() {
  return (
    <Section className="py-20 md:py-28">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-elevated/60 px-8 py-20 text-center backdrop-blur-xl md:px-16">
        <div aria-hidden className="absolute inset-0 -z-10 opacity-80" style={{ backgroundImage: "var(--gradient-hero)" }} />
        <div aria-hidden className="bg-aurora animate-aurora absolute inset-0 -z-10 opacity-60" />
        <div aria-hidden className="bg-grid grid-fade-mask absolute inset-0 -z-10 opacity-40" />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, #4F8CFF66 60deg, transparent 140deg, #22D3EE66 260deg, transparent 340deg)",
            mask: "radial-gradient(circle, transparent 50%, black 51%, black 60%, transparent 61%)",
            WebkitMask: "radial-gradient(circle, transparent 50%, black 51%, black 60%, transparent 61%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        {[...Array(10)].map((_, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute h-1 w-1 rounded-full"
            style={{
              left: `${(i * 83) % 100}%`,
              top: `${20 + ((i * 41) % 60)}%`,
              background: i % 2 ? "#22D3EE" : "#4F8CFF",
              boxShadow: i % 2 ? "0 0 8px #22D3EEaa" : "0 0 8px #4F8CFFaa",
            }}
            animate={{ y: [0, -18, 0], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 4 + (i % 4), repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-elevated/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Zap className="h-3.5 w-3.5 text-accent" />
          Ready in under 2 minutes
        </div>
        <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight md:text-6xl">
          Give your career an <span className="text-gradient-brand">operating system</span>.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Free to start. No credit card. Cancel anytime.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <div className="group relative">
            <span className="absolute -inset-0.5 rounded-lg bg-[image:var(--gradient-brand-glow)] opacity-70 blur transition duration-500 group-hover:opacity-100" />
            <Button asChild variant="primary" size="xl" className="relative">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
          <AuthAwareSignInCta />
        </div>
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-accent" /> 12,000+ users</span>
          <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-success" /> 94% match rate</span>
          <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-primary" /> RLS-secured</span>
        </div>
      </div>
    </Section>
  );
}

// ---------- Footer ----------

function Footer() {
  const cols: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Agents", href: "#agents" },
        { label: "Pricing", href: "#pricing" },
        { label: "Overview", href: "#overview" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#what-we-do" },
        { label: "Contact Us", to: "/contact" },
        { label: "Trust", href: "#trust" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "How it works", href: "#how" },
        { label: "FAQ", href: "#faq" },
        { label: "Support", href: "mailto:support@careerosai.site" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", to: "/privacy" },
        { label: "Terms of Service", to: "/terms" },
        { label: "Contact Us", to: "/contact" },
      ],
    },
  ];
  return (
    <footer className="relative border-t border-border/70 bg-background/60 backdrop-blur-xl">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="bg-aurora absolute inset-0" />
      </div>
      <div className="mx-auto grid w-full max-w-[1280px] gap-12 px-6 py-16 md:grid-cols-6 md:px-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-[15px] font-semibold">CareerOS</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            The AI operating system for your career. Contact:{" "}
            <a href="mailto:support@careerosai.site" className="text-foreground/90 hover:text-foreground">
              support@careerosai.site
            </a>
          </p>
          <div className="mt-6 flex gap-3">
            {[Twitter, Github, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="group relative rounded-lg border border-border bg-elevated p-2 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
                aria-label="Social link"
              >
                <span className="absolute inset-0 rounded-lg bg-[image:var(--gradient-brand-glow)] opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40" />
                <Icon className="relative h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link
                      to={l.to}
                      className="group inline-flex items-center gap-1 text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      <span className="transition-transform group-hover:translate-x-0.5">{l.label}</span>
                    </Link>
                  ) : (
                    <a
                      href={l.href}
                      className="group inline-flex items-center gap-1 text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      <span className="transition-transform group-hover:translate-x-0.5">{l.label}</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground md:flex-row md:px-10">
          <p>© {new Date().getFullYear()} CareerOS. All rights reserved.</p>
          <p className="flex items-center gap-2 font-mono">
            <Target className="h-3.5 w-3.5 text-accent" />
            Crafted for people who take their career seriously.
          </p>
        </div>
      </div>
    </footer>
  );
}
