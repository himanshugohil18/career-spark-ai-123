import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";
import journeyVideo from "@/assets/career-journey.mp4.asset.json";
import journeyPoster from "@/assets/career-journey-poster.jpg";

/**
 * CinematicVideo — full-width living video band for the marketing homepage.
 * Autoplays muted + looped only while in viewport, degrades to a static
 * poster on mobile or when the user prefers reduced motion.
 */
export function CinematicVideo({ ctaTo = "/auth" }: { ctaTo?: string }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const [shouldLoad, setShouldLoad] = useState(false);
  const [ready, setReady] = useState(false);

  const lightweight = isMobile || !!reduceMotion;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1.02, 1.08]);

  // Lazy-load + play/pause based on viewport intersection.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || lightweight) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          videoRef.current?.play().catch(() => {});
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.15, rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lightweight]);

  return (
    <section
      ref={sectionRef}
      aria-label="CareerOS in motion"
      className="relative isolate w-full overflow-hidden bg-[#0B1020]"
    >
      <div className="relative h-[78vh] min-h-[520px] w-full md:h-[86vh]">
        {/* media layer */}
        <motion.div style={lightweight ? undefined : { y: bgY, scale }} className="absolute inset-0">
          <img
            src={journeyPoster}
            alt="A professional planning their career with AI-assisted insight panels"
            loading="lazy"
            width={1600}
            height={912}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              ready && !lightweight ? "opacity-0" : "opacity-100"
            }`}
          />
          {!lightweight && shouldLoad ? (
            <video
              ref={videoRef}
              src={journeyVideo.url}
              poster={journeyPoster}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              onPlaying={() => setReady(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                ready ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null}
        </motion.div>

        {/* readability gradient */}
        <div
          aria-hidden
          className="absolute inset-0 bg-black/55"
        />

        {/* live indicator */}
        <div className="absolute right-5 top-5 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 backdrop-blur-md md:right-10 md:top-10">
          <motion.span
            className="h-2 w-2 rounded-full bg-[#4ADE80]"
            animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1], scale: [1, 0.85, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/80">
            Live career journey
          </span>
        </div>

        {/* overlay content */}
        <motion.div
          style={lightweight ? undefined : { y: contentY }}
          className="relative z-10 mx-auto flex h-full w-full max-w-[1100px] flex-col items-center justify-center px-6 text-center"
        >
          <motion.h2
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-6xl"
          >
            Your career is always moving.{" "}
            <span className="text-white/60">So should you.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg"
          >
            CareerOS brings your skills, opportunities, learning, and career growth
            into one intelligent workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to={ctaTo}
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-[#0B1020] shadow-[0_18px_40px_-18px_rgba(255,255,255,0.6)] transition-transform hover:-translate-y-0.5"
            >
              Explore CareerOS
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#how"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/10"
            >
              <PlayCircle className="h-4 w-4" />
              Watch how it works
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
