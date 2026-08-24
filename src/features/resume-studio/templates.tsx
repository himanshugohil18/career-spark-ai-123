/**
 * Resume Studio template renderer. Five layouts over one document model.
 * Presentation only — no data fetching, no mutation.
 */

import {
  SECTION_LABELS,
  sectionIsEmpty,
  type ResumeDoc,
  type SectionKey,
  type TemplateId,
} from "@/lib/resume-studio/document";
import { cn } from "@/lib/utils";

type Style = {
  page: string;
  name: string;
  headline: string;
  contact: string;
  sectionTitle: string;
  entryTitle: string;
  entryMeta: string;
  body: string;
  rule: string;
};

const STYLES: Record<TemplateId, Style> = {
  ats_classic: {
    page: "font-sans text-[13px] leading-relaxed",
    name: "text-2xl font-bold tracking-tight",
    headline: "text-sm font-medium text-muted-foreground",
    contact: "text-xs text-muted-foreground",
    sectionTitle: "text-[11px] font-bold uppercase tracking-[0.14em] mt-5 mb-2",
    entryTitle: "text-[13px] font-semibold",
    entryMeta: "text-xs text-muted-foreground",
    body: "text-[12.5px]",
    rule: "border-b border-border mt-1 mb-2",
  },
  modern_professional: {
    page: "font-sans text-[13px] leading-relaxed",
    name: "text-[28px] font-extrabold tracking-tight",
    headline: "text-sm font-semibold text-primary",
    contact: "text-xs text-muted-foreground",
    sectionTitle:
      "text-[11px] font-bold uppercase tracking-[0.2em] text-primary mt-6 mb-2",
    entryTitle: "text-[13.5px] font-semibold",
    entryMeta: "text-xs text-muted-foreground",
    body: "text-[12.5px]",
    rule: "border-b-2 border-primary/40 mt-1 mb-3",
  },
  technical: {
    page: "font-sans text-[12.5px] leading-relaxed",
    name: "text-2xl font-bold tracking-tight",
    headline: "text-sm font-mono text-primary",
    contact: "text-[11px] font-mono text-muted-foreground",
    sectionTitle:
      "text-[11px] font-mono font-bold uppercase tracking-[0.18em] mt-5 mb-2",
    entryTitle: "text-[13px] font-semibold",
    entryMeta: "text-[11px] font-mono text-muted-foreground",
    body: "text-[12px]",
    rule: "border-b border-dashed border-border mt-1 mb-2",
  },
  minimal: {
    page: "font-sans text-[13px] leading-7",
    name: "text-xl font-medium tracking-wide",
    headline: "text-sm text-muted-foreground",
    contact: "text-xs text-muted-foreground",
    sectionTitle:
      "text-[10.5px] uppercase tracking-[0.28em] text-muted-foreground mt-7 mb-2",
    entryTitle: "text-[13px] font-medium",
    entryMeta: "text-xs text-muted-foreground",
    body: "text-[12.5px]",
    rule: "",
  },
  executive: {
    page: "font-serif text-[13.5px] leading-relaxed",
    name: "text-[30px] font-semibold tracking-tight",
    headline: "text-sm italic text-muted-foreground",
    contact: "text-xs text-muted-foreground",
    sectionTitle:
      "text-[12px] font-semibold uppercase tracking-[0.16em] mt-6 mb-2",
    entryTitle: "text-[14px] font-semibold",
    entryMeta: "text-xs italic text-muted-foreground",
    body: "text-[13px]",
    rule: "border-b border-foreground/30 mt-1 mb-3",
  },
};

function dateRange(start: string, end: string, current: boolean): string {
  const to = current ? "Present" : end;
  return [start, to].filter(Boolean).join(" – ");
}

export function ResumePreview({
  doc,
  order,
  template,
  className,
}: {
  doc: ResumeDoc;
  order: SectionKey[];
  template: TemplateId;
  className?: string;
}) {
  const s = STYLES[template] ?? STYLES.ats_classic;
  const contact = [doc.header.email, doc.header.phone, doc.header.location].filter(Boolean);

  return (
    <article className={cn("bg-card text-card-foreground p-8 md:p-10", s.page, className)}>
      <header className={template === "minimal" ? "text-left" : "text-center"}>
        <h1 className={s.name}>{doc.header.fullName || "Your name"}</h1>
        {doc.header.headline ? <p className={cn("mt-1", s.headline)}>{doc.header.headline}</p> : null}
        {contact.length ? (
          <p className={cn("mt-2", s.contact)}>{contact.join("  ·  ")}</p>
        ) : null}
        {doc.header.links.length ? (
          <p className={cn("mt-1", s.contact)}>
            {doc.header.links.map((l, i) => (
              <span key={`${l.url}-${i}`}>
                {i > 0 ? "  ·  " : ""}
                <a href={l.url} className="underline decoration-dotted underline-offset-2">
                  {l.label || l.url}
                </a>
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {order.map((key) =>
        sectionIsEmpty(doc, key) ? null : (
          <section key={key}>
            <h2 className={s.sectionTitle}>{SECTION_LABELS[key]}</h2>
            {s.rule ? <div className={s.rule} /> : null}

            {key === "summary" ? <p className={s.body}>{doc.summary}</p> : null}

            {key === "experience"
              ? doc.experience.map((e, i) => (
                  <div key={i} className="mb-4 last:mb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className={s.entryTitle}>
                        {e.role}
                        {e.company ? <span className="font-normal"> · {e.company}</span> : null}
                      </p>
                      <p className={s.entryMeta}>{dateRange(e.startDate, e.endDate, e.isCurrent)}</p>
                    </div>
                    {e.location || e.employmentType ? (
                      <p className={s.entryMeta}>
                        {[e.location, e.employmentType].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {e.bullets.length ? (
                      <ul className={cn("mt-1 list-disc space-y-1 pl-5", s.body)}>
                        {e.bullets.map((b, bi) => (
                          <li key={bi}>{b}</li>
                        ))}
                      </ul>
                    ) : null}
                    {e.technologies.length ? (
                      <p className={cn("mt-1", s.entryMeta)}>{e.technologies.join(" · ")}</p>
                    ) : null}
                  </div>
                ))
              : null}

            {key === "projects"
              ? doc.projects.map((p, i) => (
                  <div key={i} className="mb-4 last:mb-0">
                    <p className={s.entryTitle}>{p.name}</p>
                    {p.description ? <p className={s.body}>{p.description}</p> : null}
                    {p.bullets.length ? (
                      <ul className={cn("mt-1 list-disc space-y-1 pl-5", s.body)}>
                        {p.bullets.map((b, bi) => (
                          <li key={bi}>{b}</li>
                        ))}
                      </ul>
                    ) : null}
                    {p.technologies.length ? (
                      <p className={cn("mt-1", s.entryMeta)}>{p.technologies.join(" · ")}</p>
                    ) : null}
                    {p.githubUrl || p.liveUrl ? (
                      <p className={s.entryMeta}>{[p.githubUrl, p.liveUrl].filter(Boolean).join("  ·  ")}</p>
                    ) : null}
                  </div>
                ))
              : null}

            {key === "skills" ? (
              <div className={cn("space-y-1", s.body)}>
                {doc.skills
                  .filter((g) => g.items.length > 0)
                  .map((g, i) => (
                    <p key={i}>
                      <span className="font-semibold">{g.category}: </span>
                      {g.items.join(", ")}
                    </p>
                  ))}
              </div>
            ) : null}

            {key === "education"
              ? doc.education.map((e, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className={s.entryTitle}>
                        {[e.degree, e.fieldOfStudy].filter(Boolean).join(", ")}
                      </p>
                      <p className={s.entryMeta}>{dateRange(e.startDate, e.endDate, false)}</p>
                    </div>
                    <p className={s.entryMeta}>
                      {[e.institution, e.grade].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))
              : null}

            {key === "certifications" ? (
              <ul className={cn("space-y-1", s.body)}>
                {doc.certifications.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">{c.name}</span>
                    {c.organization ? ` — ${c.organization}` : ""}
                    {c.issueDate ? ` (${c.issueDate})` : ""}
                  </li>
                ))}
              </ul>
            ) : null}

            {key === "achievements" ? (
              <ul className={cn("list-disc space-y-1 pl-5", s.body)}>
                {doc.achievements.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            ) : null}

            {key === "languages" ? (
              <p className={s.body}>
                {doc.languages
                  .map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name))
                  .join(" · ")}
              </p>
            ) : null}
          </section>
        ),
      )}
    </article>
  );
}
