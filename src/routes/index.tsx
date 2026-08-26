import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/features/landing/landing-page";
import { LandingPageImmersive } from "@/features/landing/landing-page-immersive";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerOS – AI Career Operating System" },
      {
        name: "description",
        content:
          "CareerOS is an AI-powered platform for resume optimization, job discovery, interview preparation, career planning, and application management.",
      },
      { property: "og:title", content: "CareerOS – AI Career Operating System" },
      {
        property: "og:description",
        content:
          "CareerOS is an AI-powered platform for resume optimization, job discovery, interview preparation, career planning, and application management.",
      },
      { property: "og:url", content: "https://careerosai.site/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://careerosai.site/" }],
  }),
  component: HomePage,
});

function HomePage() {
  const { theme, ready } = useTheme();
  // Render a neutral surface until the client theme is known — the head
  // script has already painted the correct background via data-theme, so
  // there is no flash of the wrong experience.
  if (!ready) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }
  return theme === "immersive" ? <LandingPageImmersive /> : <LandingPage />;
}
