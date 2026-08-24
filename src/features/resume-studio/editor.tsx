/**
 * Resume Studio editor. Controlled, presentation-level editing of a
 * ResumeDoc — the route owns persistence.
 */

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  SECTION_LABELS,
  type ResumeDoc,
  type SectionKey,
} from "@/lib/resume-studio/document";

type Patch = (updater: (draft: ResumeDoc) => void) => void;

function clone(doc: ResumeDoc): ResumeDoc {
  return JSON.parse(JSON.stringify(doc)) as ResumeDoc;
}

export function useDocPatch(doc: ResumeDoc, onChange: (next: ResumeDoc) => void): Patch {
  return (updater) => {
    const next = clone(doc);
    updater(next);
    onChange(next);
  };
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Textarea
            value={item}
            rows={2}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove line"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Add line
      </Button>
    </div>
  );
}

function Block({ title, children, onRemove }: { title: string; children: React.ReactNode; onRemove?: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        {onRemove ? (
          <Button variant="ghost" size="icon" aria-label="Remove entry" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function SectionOrderEditor({
  order,
  onChange,
}: {
  order: SectionKey[];
  onChange: (next: SectionKey[]) => void;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      {order.map((key, i) => (
        <div key={key} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5">
          <span className="text-sm">{SECTION_LABELS[key]}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" aria-label="Move up" onClick={() => move(i, -1)}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Move down" onClick={() => move(i, 1)}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocEditor({ doc, onChange }: { doc: ResumeDoc; onChange: (next: ResumeDoc) => void }) {
  const patch = useDocPatch(doc, onChange);

  return (
    <div className="space-y-6">
      <Block title="Header">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" value={doc.header.fullName} onChange={(v) => patch((d) => { d.header.fullName = v; })} />
          <Field label="Headline" value={doc.header.headline} onChange={(v) => patch((d) => { d.header.headline = v; })} />
          <Field label="Email" value={doc.header.email} onChange={(v) => patch((d) => { d.header.email = v; })} />
          <Field label="Phone" value={doc.header.phone} onChange={(v) => patch((d) => { d.header.phone = v; })} />
          <Field label="Location" value={doc.header.location} onChange={(v) => patch((d) => { d.header.location = v; })} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Links</Label>
          {doc.header.links.map((link, i) => (
            <div key={i} className="flex gap-2">
              <Input
                className="w-40"
                value={link.label}
                placeholder="LinkedIn"
                onChange={(e) => patch((d) => { d.header.links[i].label = e.target.value; })}
              />
              <Input
                value={link.url}
                placeholder="https://…"
                onChange={(e) => patch((d) => { d.header.links[i].url = e.target.value; })}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove link"
                onClick={() => patch((d) => { d.header.links.splice(i, 1); })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => patch((d) => { d.header.links.push({ label: "", url: "" }); })}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add link
          </Button>
        </div>
      </Block>

      <Block title="Professional summary">
        <Textarea
          rows={4}
          value={doc.summary}
          placeholder="Two or three lines on who you are and the value you deliver."
          onChange={(e) => patch((d) => { d.summary = e.target.value; })}
        />
      </Block>

      {doc.experience.map((exp, i) => (
        <Block
          key={i}
          title={`Experience ${i + 1}`}
          onRemove={() => patch((d) => { d.experience.splice(i, 1); })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Role" value={exp.role} onChange={(v) => patch((d) => { d.experience[i].role = v; })} />
            <Field label="Company" value={exp.company} onChange={(v) => patch((d) => { d.experience[i].company = v; })} />
            <Field label="Location" value={exp.location} onChange={(v) => patch((d) => { d.experience[i].location = v; })} />
            <Field label="Type" value={exp.employmentType} onChange={(v) => patch((d) => { d.experience[i].employmentType = v; })} />
            <Field label="Start" value={exp.startDate} placeholder="2023-06" onChange={(v) => patch((d) => { d.experience[i].startDate = v; })} />
            <Field
              label={exp.isCurrent ? "End (current role)" : "End"}
              value={exp.endDate}
              placeholder="2024-08"
              onChange={(v) => patch((d) => { d.experience[i].endDate = v; })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={exp.isCurrent}
              onChange={(e) => patch((d) => { d.experience[i].isCurrent = e.target.checked; })}
            />
            Currently working here
          </label>
          <ListEditor
            label="Bullets"
            items={exp.bullets}
            placeholder="Cut deploy time 40% by automating the release pipeline."
            onChange={(next) => patch((d) => { d.experience[i].bullets = next; })}
          />
          <Field
            label="Technologies (comma separated)"
            value={exp.technologies.join(", ")}
            onChange={(v) => patch((d) => { d.experience[i].technologies = v.split(",").map((s) => s.trim()).filter(Boolean); })}
          />
        </Block>
      ))}
      <Button
        variant="outline"
        onClick={() =>
          patch((d) => {
            d.experience.push({
              role: "", company: "", location: "", employmentType: "",
              startDate: "", endDate: "", isCurrent: false, bullets: [], technologies: [],
            });
          })
        }
      >
        <Plus className="mr-1 h-4 w-4" /> Add experience
      </Button>

      {doc.projects.map((p, i) => (
        <Block key={i} title={`Project ${i + 1}`} onRemove={() => patch((d) => { d.projects.splice(i, 1); })}>
          <Field label="Name" value={p.name} onChange={(v) => patch((d) => { d.projects[i].name = v; })} />
          <Textarea
            rows={2}
            value={p.description}
            placeholder="One line on what it does and who it is for."
            onChange={(e) => patch((d) => { d.projects[i].description = e.target.value; })}
          />
          <ListEditor label="Bullets" items={p.bullets} onChange={(next) => patch((d) => { d.projects[i].bullets = next; })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="GitHub URL" value={p.githubUrl} onChange={(v) => patch((d) => { d.projects[i].githubUrl = v; })} />
            <Field label="Live URL" value={p.liveUrl} onChange={(v) => patch((d) => { d.projects[i].liveUrl = v; })} />
          </div>
          <Field
            label="Technologies (comma separated)"
            value={p.technologies.join(", ")}
            onChange={(v) => patch((d) => { d.projects[i].technologies = v.split(",").map((s) => s.trim()).filter(Boolean); })}
          />
        </Block>
      ))}
      <Button
        variant="outline"
        onClick={() =>
          patch((d) => {
            d.projects.push({ name: "", description: "", technologies: [], bullets: [], githubUrl: "", liveUrl: "" });
          })
        }
      >
        <Plus className="mr-1 h-4 w-4" /> Add project
      </Button>

      <Block title="Skills">
        {doc.skills.map((group, i) => (
          <div key={i} className="space-y-2 rounded-md border border-border/60 p-3">
            <div className="flex gap-2">
              <Input
                className="w-48"
                value={group.category}
                placeholder="Cloud"
                onChange={(e) => patch((d) => { d.skills[i].category = e.target.value; })}
              />
              <Button variant="ghost" size="icon" aria-label="Remove group" onClick={() => patch((d) => { d.skills.splice(i, 1); })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              rows={2}
              value={group.items.join(", ")}
              placeholder="AWS, Docker, Kubernetes"
              onChange={(e) => patch((d) => { d.skills[i].items = e.target.value.split(",").map((s) => s.trim()).filter(Boolean); })}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => patch((d) => { d.skills.push({ category: "", items: [] }); })}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add skill group
        </Button>
      </Block>

      {doc.education.map((e, i) => (
        <Block key={i} title={`Education ${i + 1}`} onRemove={() => patch((d) => { d.education.splice(i, 1); })}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Degree" value={e.degree} onChange={(v) => patch((d) => { d.education[i].degree = v; })} />
            <Field label="Field of study" value={e.fieldOfStudy} onChange={(v) => patch((d) => { d.education[i].fieldOfStudy = v; })} />
            <Field label="Institution" value={e.institution} onChange={(v) => patch((d) => { d.education[i].institution = v; })} />
            <Field label="Grade / CGPA" value={e.grade} onChange={(v) => patch((d) => { d.education[i].grade = v; })} />
            <Field label="Start" value={e.startDate} onChange={(v) => patch((d) => { d.education[i].startDate = v; })} />
            <Field label="End" value={e.endDate} onChange={(v) => patch((d) => { d.education[i].endDate = v; })} />
          </div>
        </Block>
      ))}
      <Button
        variant="outline"
        onClick={() =>
          patch((d) => {
            d.education.push({ degree: "", fieldOfStudy: "", institution: "", startDate: "", endDate: "", grade: "" });
          })
        }
      >
        <Plus className="mr-1 h-4 w-4" /> Add education
      </Button>

      <Block title="Certifications">
        {doc.certifications.map((c, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-border/60 p-3 sm:grid-cols-2">
            <Field label="Name" value={c.name} onChange={(v) => patch((d) => { d.certifications[i].name = v; })} />
            <Field label="Organization" value={c.organization} onChange={(v) => patch((d) => { d.certifications[i].organization = v; })} />
            <Field label="Issued" value={c.issueDate} onChange={(v) => patch((d) => { d.certifications[i].issueDate = v; })} />
            <Field label="Credential URL" value={c.credentialUrl} onChange={(v) => patch((d) => { d.certifications[i].credentialUrl = v; })} />
            <div className="sm:col-span-2">
              <Button variant="ghost" size="sm" onClick={() => patch((d) => { d.certifications.splice(i, 1); })}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            patch((d) => {
              d.certifications.push({ name: "", organization: "", issueDate: "", credentialId: "", credentialUrl: "" });
            })
          }
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add certification
        </Button>
      </Block>

      <Block title="Achievements">
        <ListEditor label="Achievements" items={doc.achievements} onChange={(next) => patch((d) => { d.achievements = next; })} />
      </Block>

      <Block title="Languages">
        {doc.languages.map((l, i) => (
          <div key={i} className="flex gap-2">
            <Input value={l.name} placeholder="English" onChange={(e) => patch((d) => { d.languages[i].name = e.target.value; })} />
            <Input
              value={l.proficiency}
              placeholder="Fluent"
              onChange={(e) => patch((d) => { d.languages[i].proficiency = e.target.value; })}
            />
            <Button variant="ghost" size="icon" aria-label="Remove language" onClick={() => patch((d) => { d.languages.splice(i, 1); })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => patch((d) => { d.languages.push({ name: "", proficiency: "" }); })}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add language
        </Button>
      </Block>
    </div>
  );
}
