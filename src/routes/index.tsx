import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/features/landing/landing-page";

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
  component: LandingPage,
});
