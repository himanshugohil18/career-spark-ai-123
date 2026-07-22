import {
  FileText,
  Sparkles,
  Radar,
  Brain,
  MessagesSquare,
  Send,
  GraduationCap,
  TrendingUp,
  Shield,
  Lock,
  UserCheck,
  Eye,
  Mail,
  Globe,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Section, SectionHeading } from "@/components/landing/section";

const PRODUCT_CARDS = [
  { icon: FileText, title: "AI Resume Analysis", desc: "Deep, section-by-section analysis of your resume with clear, actionable feedback." },
  { icon: Sparkles, title: "Resume Optimizer", desc: "Rewrite bullets, tailor keywords, and align your resume to any target role." },
  { icon: Radar, title: "Job Discovery", desc: "Aggregated openings across major job boards, ranked by relevance to your profile." },
  { icon: Brain, title: "AI Career Brain", desc: "A personalized model of your skills, goals, and preferences that guides every recommendation." },
  { icon: MessagesSquare, title: "Interview Preparation", desc: "Role-specific practice questions and real-time coaching from an AI interviewer." },
  { icon: Send, title: "AI Job Application Assistant", desc: "Draft tailored cover letters and application answers in seconds." },
  { icon: GraduationCap, title: "Learning Recommendations", desc: "Curated resources to close skill gaps based on your target roles." },
  { icon: TrendingUp, title: "Career Analytics", desc: "Track applications, response rates, and progress toward your career goals." },
];

const FEATURE_GRID = [
  "Resume AI",
  "Career Brain",
  "Job Matching",
  "Interview Prep",
  "AI Coach",
  "Application Tracking",
  "Analytics",
  "Learning",
];

const TRUST_POINTS = [
  { icon: Lock, text: "Secure authentication" },
  { icon: Shield, text: "Encrypted storage" },
  { icon: UserCheck, text: "User-controlled data" },
  { icon: Eye, text: "Privacy-first design" },
  { icon: Sparkles, text: "AI-powered recommendations" },
];

export function ComplianceSections() {
  return (
    <>
      {/* What CareerOS Does */}
      <Section id="what-we-do" className="py-20 md:py-24">
        <SectionHeading
          eyebrow="Platform"
          title="What CareerOS does"
          description="A unified AI platform that helps students, job seekers, and professionals manage every stage of their career."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCT_CARDS.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="group relative rounded-2xl border border-border/70 bg-elevated/40 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="font-display text-[15px] font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* Feature grid overview */}
      <Section id="overview" className="py-16 md:py-20">
        <SectionHeading eyebrow="Overview" title="Everything in one workspace" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FEATURE_GRID.map((f) => (
            <div
              key={f}
              className="rounded-xl border border-border/70 bg-elevated/30 px-4 py-3 text-center text-sm font-medium text-foreground/90 backdrop-blur"
            >
              {f}
            </div>
          ))}
        </div>
      </Section>

      {/* How We Use Your Data */}
      <Section id="data-use" className="py-20 md:py-24">
        <SectionHeading
          eyebrow="Transparency"
          title="How we use your data"
          description="We request Google account information only to power the CareerOS experience — nothing more."
        />
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-elevated/40 p-6 backdrop-blur">
            <h3 className="font-display text-base font-semibold text-foreground">We use your information to</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• Authenticate users</li>
              <li>• Create a secure account</li>
              <li>• Personalize CareerOS</li>
              <li>• Save resumes</li>
              <li>• Save preferences</li>
              <li>• Improve job recommendations</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border/70 bg-elevated/40 p-6 backdrop-blur">
            <h3 className="font-display text-base font-semibold text-foreground">Your rights</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• We never sell personal information.</li>
              <li>• You remain in full control of your data.</li>
              <li>• You may delete your account at any time.</li>
              <li>• You can request a copy of your data.</li>
            </ul>
            <Link
              to="/privacy"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Read the full Privacy Policy →
            </Link>
          </div>
        </div>
      </Section>

      {/* Why Sign in with Google */}
      <Section id="google-signin" className="py-20 md:py-24">
        <SectionHeading
          eyebrow="Authentication"
          title="Why sign in with Google?"
          description="Google Sign-In gives you a fast, secure way to access CareerOS with limited, purpose-bound access."
        />
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-elevated/40 p-6 backdrop-blur">
            <h3 className="font-display text-base font-semibold text-foreground">Google Sign-In is used only to</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• Create your account</li>
              <li>• Secure authentication</li>
              <li>• Personalize your experience</li>
              <li>• Sync your CareerOS data</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border/70 bg-elevated/40 p-6 backdrop-blur">
            <h3 className="font-display text-base font-semibold text-foreground">What we do not access</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              CareerOS does not post to Google services and does not access Gmail,
              Drive, Contacts, Calendar, Photos, or any other Google product.
              We only receive your basic profile (name, email, avatar) to create
              your account.
            </p>
          </div>
        </div>
      </Section>

      {/* Trust */}
      <Section id="trust" className="py-16 md:py-20">
        <SectionHeading eyebrow="Trust" title="Why users trust CareerOS" />
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3">
          {TRUST_POINTS.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-elevated/40 px-4 py-2 text-sm text-foreground/90 backdrop-blur"
            >
              <Icon className="h-4 w-4 text-primary" />
              {text}
            </div>
          ))}
        </div>
      </Section>

      {/* Contact */}
      <Section id="contact" className="py-16 md:py-20">
        <SectionHeading eyebrow="Contact" title="Get in touch" />
        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
          <a
            href="mailto:support@careerosai.site"
            className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-elevated/40 p-5 backdrop-blur transition hover:border-primary/40"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/60 text-primary">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Support Email</p>
              <p className="text-sm font-medium text-foreground">support@careerosai.site</p>
            </div>
          </a>
          <a
            href="https://careerosai.site"
            className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-elevated/40 p-5 backdrop-blur transition hover:border-primary/40"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/60 text-primary">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Business Website</p>
              <p className="text-sm font-medium text-foreground">https://careerosai.site</p>
            </div>
          </a>
        </div>
      </Section>

      {/* Privacy notice banner */}
      <Section className="py-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border/70 bg-elevated/40 px-6 py-5 text-center text-sm leading-relaxed text-muted-foreground backdrop-blur">
          CareerOS respects your privacy. We only collect the information
          necessary to provide AI-powered career services.{" "}
          <Link to="/privacy" className="font-medium text-primary hover:underline">
            Read our Privacy Policy
          </Link>{" "}
          to learn more.
        </div>
      </Section>
    </>
  );
}
