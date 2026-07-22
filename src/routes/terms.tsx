import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { Section } from "@/components/landing/section";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — CareerOS" },
      {
        name: "description",
        content: "The terms that govern your use of the CareerOS AI career platform.",
      },
      { property: "og:title", content: "Terms of Service — CareerOS" },
      { property: "og:description", content: "Terms that govern your use of CareerOS." },
      { property: "og:url", content: "https://careerosai.site/terms" },
    ],
    links: [{ rel: "canonical", href: "https://careerosai.site/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24">
        <Section className="py-16 md:py-20">
          <article className="mx-auto max-w-3xl space-y-6">
            <header>
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Legal</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
                Terms of Service
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Last updated: {new Date().getFullYear()}
              </p>
            </header>

            <section className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
              <h2 className="font-display text-xl font-semibold text-foreground">1. Acceptance</h2>
              <p>
                By accessing or using CareerOS, you agree to these Terms of
                Service and our Privacy Policy.
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">2. Use of the service</h2>
              <p>
                You agree to use CareerOS only for lawful career-related
                purposes and not to abuse, reverse-engineer, or disrupt the
                platform.
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">3. Account</h2>
              <p>
                You are responsible for keeping your account credentials secure
                and for all activity that happens under your account.
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">4. AI content</h2>
              <p>
                CareerOS uses AI to generate suggestions such as resume edits,
                cover letters, and interview answers. Output may contain errors.
                Always review AI-generated content before using it.
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">5. Payments</h2>
              <p>
                Paid plans are billed through our payments provider. Fees and
                billing cycles are shown at checkout. You may cancel at any time.
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">6. Termination</h2>
              <p>
                You may delete your account at any time. We may suspend accounts
                that violate these terms.
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">7. Liability</h2>
              <p>
                CareerOS is provided "as is" without warranties. To the maximum
                extent permitted by law, we are not liable for indirect or
                consequential damages arising from use of the service.
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">8. Contact</h2>
              <p>
                Questions? Email{" "}
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
