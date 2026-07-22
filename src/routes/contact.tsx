import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Globe } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Section } from "@/components/landing/section";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — CareerOS" },
      {
        name: "description",
        content: "Get in touch with the CareerOS team for support, partnerships, or feedback.",
      },
      { property: "og:title", content: "Contact — CareerOS" },
      { property: "og:description", content: "Contact the CareerOS team." },
      { property: "og:url", content: "https://careerosai.site/contact" },
    ],
    links: [{ rel: "canonical", href: "https://careerosai.site/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24">
        <Section className="py-16 md:py-20">
          <div className="mx-auto max-w-3xl">
            <header className="text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Contact</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
                Get in touch
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                We're happy to help with support, partnerships, or feedback.
              </p>
            </header>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
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

            <div className="mt-10 text-center">
              <Link to="/" className="text-sm text-primary hover:underline">← Back to CareerOS</Link>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
