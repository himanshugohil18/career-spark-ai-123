import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { Section } from "@/components/landing/section";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CareerOS" },
      {
        name: "description",
        content:
          "How CareerOS collects, uses, and protects your personal data across our AI career platform.",
      },
      { property: "og:title", content: "Privacy Policy — CareerOS" },
      { property: "og:description", content: "How CareerOS handles your personal data." },
      { property: "og:url", content: "https://careerosai.site/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://careerosai.site/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24">
        <Section className="py-16 md:py-20">
          <article className="mx-auto max-w-3xl space-y-6">
            <header>
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Legal</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
                Privacy Policy
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Last updated: {new Date().getFullYear()}
              </p>
            </header>

            <section className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
              <h2 className="font-display text-xl font-semibold text-foreground">1. Overview</h2>
              <p>
                CareerOS ("we", "us") provides an AI-powered career operating
                system for students, job seekers, and professionals. This policy
                explains what data we collect, how we use it, and the choices
                you have.
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">2. Information we collect</h2>
              <ul className="list-inside list-disc space-y-1">
                <li>Account information (name, email, avatar) from Google Sign-In or email signup.</li>
                <li>Resume content and preferences you upload or enter.</li>
                <li>Usage data (features used, sessions, and diagnostic logs).</li>
              </ul>

              <h2 className="font-display text-xl font-semibold text-foreground">3. How we use your data</h2>
              <p>We use your information only to:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Authenticate users and create a secure account.</li>
                <li>Personalize CareerOS to your goals.</li>
                <li>Save resumes and preferences.</li>
                <li>Improve job recommendations and career insights.</li>
              </ul>

              <h2 className="font-display text-xl font-semibold text-foreground">4. Google user data</h2>
              <p>
                When you sign in with Google, we receive your basic profile
                (name, email, avatar). CareerOS does not access Gmail, Drive,
                Contacts, Calendar, Photos, or any other Google product, and we
                never post on your behalf.
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">5. Data sharing</h2>
              <p>
                We do not sell personal information. We share data only with
                infrastructure providers strictly necessary to operate CareerOS
                (hosting, authentication, and AI processing), under standard
                data-processing agreements.
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">6. Security</h2>
              <p>
                Data is encrypted in transit and at rest. Access is protected
                with row-level security policies and modern authentication.
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">7. Your rights</h2>
              <p>
                You may access, export, or delete your account and data at any
                time from Settings, or by contacting{" "}
                <a className="text-primary hover:underline" href="mailto:support@careerosai.site">
                  support@careerosai.site
                </a>
                .
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">8. Contact</h2>
              <p>
                Questions about this policy? Email{" "}
                <a className="text-primary hover:underline" href="mailto:support@careerosai.site">
                  support@careerosai.site
                </a>
                .
              </p>
            </section>

            <div className="pt-4">
              <Link to="/" className="text-sm text-primary hover:underline">← Back to CareerOS</Link>
            </div>
          </article>
        </Section>
      </main>
    </div>
  );
}
