import { Building2, Globe, Sparkles } from "lucide-react";

export type CompanyHeaderData = {
  name?: string | null;
  logo_url?: string | null;
  industry?: string | null;
  size?: string | null;
  remote_policy?: string | null;
  website?: string | null;
  tech_stack?: string[] | null;
  description?: string | null;
};

export function CompanyHeader({ company, otherRolesCount }: { company: CompanyHeaderData | null; otherRolesCount?: number }) {
  if (!company) return null;
  return (
    <div className="surface-card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-elevated">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt={company.name ?? "Company"} className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold">{company.name ?? "Company"}</h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {company.industry && <span>{company.industry}</span>}
            {company.size && <span>{company.size}</span>}
            {company.remote_policy && <span>{company.remote_policy}</span>}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Globe className="h-3 w-3" /> Website
              </a>
            )}
            {typeof otherRolesCount === "number" && otherRolesCount > 0 && (
              <span>{otherRolesCount} other open roles</span>
            )}
          </div>
        </div>
      </div>
      {(company.tech_stack ?? []).length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent" /> Tech stack
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(company.tech_stack ?? []).slice(0, 16).map((t) => (
              <span key={t} className="rounded-full border border-border bg-elevated px-2 py-0.5 text-xs text-foreground/80">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
