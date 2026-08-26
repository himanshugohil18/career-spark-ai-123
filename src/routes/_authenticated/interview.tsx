import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/interview")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/interview") throw redirect({ to: "/interview/", replace: true });
  },
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