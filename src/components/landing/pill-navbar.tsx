import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { useSession } from "@/hooks/use-session";

const NAV = [
  { label: "Product", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Results", href: "#results" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

/** Floating pill navigation — light marketing surface. */
export function PillNavbar() {
  const { isAuthenticated, loading } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8">
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "mx-auto flex w-full max-w-[1100px] items-center justify-between rounded-full border border-border bg-card/90 px-3 py-2.5 backdrop-blur-xl transition-shadow duration-300 md:px-4",
          scrolled ? "shadow-[var(--shadow-elevated)]" : "shadow-[var(--shadow-soft)]",
        )}
      >
        <Link to="/" className="flex items-center gap-2 pl-1.5">
          <Logo size={26} />
          <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            CareerOS
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {loading ? null : isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Go to dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-full p-2 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </motion.header>

      <motion.div
        initial={false}
        animate={open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="mx-auto mt-2 w-full max-w-[1100px] overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-elevated)] md:hidden"
      >
        <div className="flex flex-col gap-1 p-4">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-[15px] font-medium text-foreground hover:bg-secondary"
            >
              {item.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ mode: "signin" }}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-medium text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
