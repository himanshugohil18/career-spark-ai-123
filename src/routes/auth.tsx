import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/landing/logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign in · CareerOS" },
      {
        name: "description",
        content: "Sign in to CareerOS — your AI career operating system.",
      },
      { property: "og:title", content: "Sign in · CareerOS" },
      {
        property: "og:description",
        content: "Sign in to CareerOS — your AI career operating system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(initialMode ?? "signin");

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    document.title = mode === "signup" ? "Sign up · CareerOS" : "Sign in · CareerOS";
  }, [mode]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      {/* Ambient global background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-accent"
      />
      <div aria-hidden className="bg-grid grid-fade-mask absolute inset-0 -z-10" />

      <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
        <BrandingPanel mode={mode} />
        <FormPanel mode={mode} setMode={setMode} />
      </div>
    </div>
  );
}

/* -------------------------------- Branding -------------------------------- */

function BrandingPanel({ mode }: { mode: Mode }) {
  return (
    <div className="relative hidden overflow-hidden border-r border-border/50 lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* orb */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute -left-24 top-1/4 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: "var(--gradient-brand-glow)", opacity: 0.35 }}
      />
      <motion.div
        aria-hidden
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute right-10 top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
      />

      {/* header */}
      <div className="relative z-10">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-[15px] font-semibold tracking-tight">
            CareerOS
          </span>
        </Link>
      </div>

      {/* body */}
      <div className="relative z-10 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          The AI Career Operating System
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-6 font-display text-4xl font-semibold tracking-tight leading-[1.1] xl:text-5xl"
        >
          {mode === "signup" ? (
            <>Build a career that <span className="text-gradient-brand">runs itself</span>.</>
          ) : (
            <>Welcome back to your <span className="text-gradient-brand">workspace</span>.</>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-5 text-base leading-relaxed text-muted-foreground"
        >
          Specialized agents discover roles, tailor applications, and prepare
          you for every interview — all grounded in one structured Career Brain.
        </motion.p>

        <ul className="mt-8 space-y-3">
          {[
            "Career Brain — a living model of your skills & goals",
            "Signal-driven discovery, ranked by real fit",
            "Adaptive mock interviews and coaching",
          ].map((t, i) => (
            <motion.li
              key={t}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
              className="flex items-start gap-3 text-sm text-foreground/85"
            >
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                <Check className="h-3 w-3" />
              </span>
              {t}
            </motion.li>
          ))}
        </ul>
      </div>

      {/* footer quote */}
      <div className="relative z-10">
        <figure className="max-w-md rounded-2xl border border-border/60 bg-elevated/40 p-5 backdrop-blur">
          <blockquote className="text-sm leading-relaxed text-foreground/90">
            "CareerOS replaced three tools and a spreadsheet. My applications
            went out faster and landed better."
          </blockquote>
          <figcaption className="mt-3 flex items-center gap-3">
            <div
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-primary-foreground"
              className="bg-primary"
            >
              A
            </div>
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Ananya S.</div>
              Staff Engineer · fintech
            </div>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

/* --------------------------------- Form ----------------------------------- */

function FormPanel({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-y-auto px-5 pb-12 pt-24 sm:px-10 sm:pt-16 lg:py-12">
      {/* mobile brand */}
      <Link
        to="/"
        className="absolute left-6 top-6 inline-flex items-center gap-2 lg:hidden"
      >
        <Logo />
        <span className="font-display text-sm font-semibold">CareerOS</span>
      </Link>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <AuthCard mode={mode} setMode={setMode} />
          </motion.div>

        </AnimatePresence>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <a href="#" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

type PasswordlessMode = "magic" | "otp";

const CANONICAL_APP_ORIGIN = "https://careerosai.site";

function getAuthRedirectOrigin() {
  if (typeof window === "undefined") return CANONICAL_APP_ORIGIN;

  const { hostname, origin } = window.location;
  const isLocalPreview = hostname === "localhost" || hostname === "127.0.0.1";
  const isEditorPreview = hostname.startsWith("id-preview--");

  if (isLocalPreview || isEditorPreview || hostname.endsWith("careerosai.site")) {
    return origin;
  }

  return CANONICAL_APP_ORIGIN;
}

function AuthCard({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [loading, setLoading] = useState<false | "email" | "google" | "magic" | "otp" | "reset">(false);

  // Passwordless state
  const [passwordless, setPasswordless] = useState<null | PasswordlessMode>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const strength = useMemo(() => scorePassword(password), [password]);
  const isSignup = mode === "signup";

  async function handleOAuth() {
    setLoading("google");
    try {
      // Remember that we started an OAuth flow so the landing page can
      // forward the user to the dashboard once the session is hydrated.
      try {
        sessionStorage.setItem("careeros:oauth-redirect", "1");
      } catch {
        /* ignore */
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: getAuthRedirectOrigin(),

        // Always show the Google account chooser instead of silently
        // reusing the browser's already-signed-in account.
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        toast.error("Google sign-in failed", { description: result.error.message });
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in successfully", { description: "Taking you to your dashboard…" });
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error("Google sign-in failed", {
        description: e instanceof Error ? e.message : String(e),
      });
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    setLoading("reset");
    try {
      // Route through our branded Brevo template. Handler always resolves
      // ok (enumeration guard) — surface a generic confirmation either way.
      const { requestPasswordReset } = await import("@/lib/email/notify.functions");
      await requestPasswordReset({ data: { email } });
      toast.success("Password reset email sent", {
        description: "If an account exists for that address, a reset link is on its way.",
      });
    } catch (e) {
      toast.error("Could not send reset email", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading("magic");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
      });
      if (error) throw error;
      toast.success("Magic link sent", { description: "Check your email and click the link to sign in." });
    } catch (err) {
      toast.error("Could not send magic link", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading("otp");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success("Code sent", { description: "We emailed you a 6-digit code." });
    } catch (err) {
      toast.error("Could not send code", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || otpCode.length < 6) return;
    setLoading("otp");
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: "email" });
      if (error) throw error;
      toast.success("Signed in successfully", { description: "Taking you to your dashboard…" });
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("Invalid or expired code", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (isSignup && password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading("email");
    try {
      if (isSignup) {
        // Server-side duplicate-email validation before creating the account.
        const { checkEmailAvailable } = await import("@/lib/auth.functions");
        const check = await checkEmailAvailable({ data: { email } });
        if (!check.available) {
          toast.error("This email is already registered", {
            description:
              check.provider === "google"
                ? "That account was created with Google — use “Continue with Google” to sign in."
                : "Try signing in instead, or reset your password.",
          });
          setMode("signin");
          return;
        }

        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || undefined },
          },
        });
        if (error) throw error;
        // Supabase returns a decoy user with no identities when the email
        // already exists — treat that as a duplicate registration.
        if (signUpData?.user && (signUpData.user.identities?.length ?? 0) === 0) {
          toast.error("This email is already registered", {
            description: "Try signing in instead, or reset your password.",
          });
          setMode("signin");
          return;
        }
        toast.success("Check your email to confirm your account.");

        // Fire welcome email in the background (server function derives
        // recipient from the session — auto no-op if signup requires
        // email confirmation).
        void (async () => {
          try {
            const { notifyWelcome } = await import("@/lib/email/notify.functions");
            await notifyWelcome();
          } catch {
            /* non-fatal */
          }
        })();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void (async () => {
          try {
            const { notifyLogin } = await import("@/lib/email/notify.functions");
            await notifyLogin({ data: { provider: "password", userAgent: navigator.userAgent } });
          } catch {
            /* non-fatal */
          }
        })();
        toast.success("Signed in successfully", { description: "Taking you to your dashboard…" });
        navigate({ to: "/dashboard" });
      }

    } catch (err) {
      toast.error(isSignup ? "Sign up failed" : "Sign in failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 sm:p-8 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)]">
      {/* subtle inner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-40 blur-3xl"
        className="bg-primary"
      />

      <div className="relative">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-[26px]">
          {isSignup ? "Create your workspace" : "Sign in to CareerOS"}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isSignup
            ? "Start building your Career Brain in under two minutes."
            : "Continue where your agents left off."}
        </p>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className={cn(
            "mt-6 w-full transition-all",
            isSignup
              ? "bg-background text-foreground hover:bg-muted"
              : "bg-primary text-primary-foreground hover:bg-primary-hover"
          )}
          disabled={loading !== false}
          onClick={handleOAuth}
          aria-label="Continue with Google"
        >
          {loading === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            or continue with email
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          {isSignup && (
            <Field
              id="name"
              label="Full name"
              icon={<User className="h-4 w-4" />}
            >
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-11 pl-9"
                autoComplete="name"
              />
            </Field>
          )}

          <Field id="email" label="Email" icon={<Mail className="h-4 w-4" />}>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@work.com"
              className="h-11 pl-9"
              autoComplete="email"
            />
          </Field>

          <Field
            id="password"
            label="Password"
            icon={<Lock className="h-4 w-4" />}
            right={
              !isSignup ? (
                <button
                  type="button"
                  onClick={handleForgot}
                  disabled={loading !== false}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {loading === "reset" ? "Sending…" : "Forgot?"}
                </button>
              ) : null
            }
          >
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCapsOn(e.getModifierState?.("CapsLock") ?? false)}
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
                className="h-11 pl-9 pr-10"
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
                aria-label={showPw ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {capsOn && (
              <p className="mt-1.5 text-[11px] text-warning">Caps Lock is on</p>
            )}
          </Field>

          {isSignup && (
            <>
              <Field
                id="confirm"
                label="Confirm password"
                icon={<Lock className="h-4 w-4" />}
              >
                <Input
                  id="confirm"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="h-11 pl-9"
                  autoComplete="new-password"
                />
                {confirm.length > 0 && confirm !== password && (
                  <p className="mt-1.5 text-[11px] text-danger">
                    Passwords don't match
                  </p>
                )}
              </Field>

              <PasswordStrength strength={strength} value={password} />
            </>
          )}

          {!isSignup && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(Boolean(v))}
              />
              Remember me on this device
            </label>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-2 w-full bg-primary transition-colors hover:bg-primary-hover"
            disabled={loading !== false}
          >
            {loading === "email" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {isSignup ? "Create account" : "Sign in"}
            {loading !== "email" && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        {/* Passwordless */}
        {!isSignup && (
          <div className="mt-5 rounded-lg border border-border/60 bg-elevated/40 p-3">
            {!passwordless && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  disabled={loading !== false}
                  onClick={() => setPasswordless("magic")}
                >
                  Send magic link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  disabled={loading !== false}
                  onClick={() => setPasswordless("otp")}
                >
                  Email me a code
                </Button>
              </div>
            )}

            {passwordless === "magic" && (
              <form onSubmit={handleMagicLink} className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  We'll email a one-tap link to <span className="text-foreground">{email || "your email"}</span>.
                </p>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" variant="primary" className="flex-1" disabled={loading !== false || !email}>
                    {loading === "magic" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Send magic link
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPasswordless(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {passwordless === "otp" && (
              <div className="space-y-2">
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-2">
                    <p className="text-[11px] text-muted-foreground">
                      We'll email a 6-digit code to <span className="text-foreground">{email || "your email"}</span>.
                    </p>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" variant="primary" className="flex-1" disabled={loading !== false || !email}>
                        {loading === "otp" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Send code
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPasswordless(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-2">
                    <Input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="h-10 tracking-[0.3em] text-center font-mono"
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" variant="primary" className="flex-1" disabled={loading !== false || otpCode.length < 6}>
                        {loading === "otp" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Verify & sign in
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setOtpSent(false); setOtpCode(""); }}>
                        Resend
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account?" : "New to CareerOS?"}{" "}
          <button
            type="button"
            onClick={() => setMode(isSignup ? "signin" : "signup")}
            className="font-medium text-primary hover:text-primary-hover"
          >
            {isSignup ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}

/* --------------------------------- Bits ----------------------------------- */

function Field({
  id,
  label,
  icon,
  right,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-[13px]">
          {label}
        </Label>
        {right}
      </div>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

function scorePassword(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

function PasswordStrength({
  strength,
  value,
}: {
  strength: number;
  value: string;
}) {
  const labels = ["Too weak", "Weak", "Okay", "Strong", "Excellent"];
  const colors = [
    "bg-danger",
    "bg-danger/80",
    "bg-warning",
    "bg-primary",
    "bg-success",
  ];
  const reqs = [
    { ok: value.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Z]/.test(value) && /[a-z]/.test(value), label: "Upper & lower case" },
    { ok: /\d/.test(value), label: "A number" },
    { ok: /[^A-Za-z0-9]/.test(value), label: "A symbol" },
  ];
  return (
    <div className="rounded-lg border border-border/60 bg-elevated/40 p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Password strength</span>
        <span className="font-medium text-foreground">
          {value ? labels[strength] : "—"}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < strength ? colors[strength] : "bg-border",
            )}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
        {reqs.map((r) => (
          <li
            key={r.label}
            className={cn(
              "flex items-center gap-1.5",
              r.ok ? "text-success" : "text-muted-foreground",
            )}
          >
            {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-50" />}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

