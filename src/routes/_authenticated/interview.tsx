import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({
    meta: [
      { title: "Interview Prep · CareerOS" },
      {
        name: "description",
        content: "Practice interview questions, track readiness, and run AI mock interviews in CareerOS.",
      },
      { property: "og:title", content: "Interview Prep · CareerOS" },
      {
        property: "og:description",
        content: "Practice interview questions, track readiness, and run AI mock interviews in CareerOS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Outlet,
});