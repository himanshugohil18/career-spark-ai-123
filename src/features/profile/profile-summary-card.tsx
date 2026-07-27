import { Link } from "@tanstack/react-router";
import { Briefcase, Github, Globe, Linkedin, Mail, MapPin, Phone, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProfileRow = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  current_title?: string | null;
  years_of_experience?: number | null;
  preferred_role?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  website_url?: string | null;
  avatar_url?: string | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Compact "who am I" card for the dashboard, sourced from the live profile. */
export function ProfileSummaryCard({
  profile,
  fallbackEmail,
  completeness,
}: {
  profile: ProfileRow | null | undefined;
  fallbackEmail?: string | null;
  completeness?: number;
}) {
  const name = profile?.full_name?.trim() || fallbackEmail?.split("@")[0] || "Your profile";
  const email = profile?.email || fallbackEmail || null;

  const facts = [
    profile?.current_title && { icon: Briefcase, text: profile.current_title },
    profile?.location && { icon: MapPin, text: profile.location },
    email && { icon: Mail, text: email },
    profile?.phone && { icon: Phone, text: profile.phone },
  ].filter(Boolean) as { icon: typeof Mail; text: string }[];

  const links = [
    profile?.linkedin_url && { icon: Linkedin, href: profile.linkedin_url, label: "LinkedIn" },
    profile?.github_url && { icon: Github, href: profile.github_url, label: "GitHub" },
    (profile?.portfolio_url || profile?.website_url) && {
      icon: Globe,
      href: (profile?.portfolio_url || profile?.website_url) as string,
      label: "Website",
    },
  ].filter(Boolean) as { icon: typeof Globe; href: string; label: string }[];

  return (
    <div className="surface-elevated rounded-2xl border border-border/60 p-5 md:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border/60 bg-primary/10 font-display text-lg font-semibold text-primary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
            ) : (
              initials(name) || "?"
            )}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Signed in as
            </p>
            <h2 className="mt-1 truncate font-display text-xl font-semibold">{name}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {facts.map((f) => (
                <span key={f.text} className="inline-flex items-center gap-1.5">
                  <f.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{f.text}</span>
                </span>
              ))}
              {typeof profile?.years_of_experience === "number" && (
                <span>{profile.years_of_experience} yrs experience</span>
              )}
            </div>
            {links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <l.icon className="h-3.5 w-3.5" /> {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          {typeof completeness === "number" && (
            <div className="w-40">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Profile complete</span>
                <span className="text-foreground">{completeness}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                <div className="h-full rounded-full bg-primary" style={{ width: `${completeness}%` }} />
              </div>
            </div>
          )}
          <Link to="/profile">
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4" /> Edit profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
