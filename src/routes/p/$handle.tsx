import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MapPin, Briefcase, Globe, Linkedin, Github, Link2 } from "lucide-react";
import { getPublicProfile } from "@/lib/public-profile.functions";

export const Route = createFileRoute("/p/$handle")({
  loader: async ({ params }) => {
    const profile = await getPublicProfile({ data: { handle: params.handle.toLowerCase() } });
    if (!profile) throw notFound();
    return profile;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.full_name ?? "Professional"} · CareerOS Profile` },
      { name: "description", content: loaderData?.professional_summary?.slice(0, 155) ?? "Public career profile on CareerOS." },
      { property: "og:title", content: `${loaderData?.full_name ?? "Professional"} · CareerOS Profile` },
      { property: "og:description", content: loaderData?.professional_summary?.slice(0, 155) ?? "Public career profile on CareerOS." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Profile not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This profile is private or doesn't exist.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Go to CareerOS
        </Link>
      </div>
    </div>
  ),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const profile = Route.useLoaderData();
  const links = [
    { url: profile.linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { url: profile.github_url, icon: Github, label: "GitHub" },
    { url: profile.portfolio_url, icon: Globe, label: "Portfolio" },
    { url: profile.website_url, icon: Link2, label: "Website" },
  ].filter((l) => l.url);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="surface-card p-8 text-center md:p-10">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={`${profile.full_name ?? "Profile"} avatar`}
              className="mx-auto h-24 w-24 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {(profile.full_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <h1 className="mt-5 text-2xl font-semibold text-foreground">{profile.full_name}</h1>
          {profile.current_title && (
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" /> {profile.current_title}
              {profile.years_of_experience ? ` · ${profile.years_of_experience} yrs` : ""}
            </p>
          )}
          {profile.location && (
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {profile.location}
            </p>
          )}
          {profile.professional_summary && (
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-foreground">
              {profile.professional_summary}
            </p>
          )}
          {links.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <l.icon className="h-3.5 w-3.5" /> {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Powered by <Link to="/" className="font-medium text-primary hover:underline">CareerOS</Link> — the AI career operating system
        </p>
      </div>
    </div>
  );
}
