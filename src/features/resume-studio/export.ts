/**
 * Client-side resume export. PDF is generated with real, selectable text
 * (never a screenshot) so ATS parsers can read it. DOCX is a Word-compatible
 * HTML document, which Word/Google Docs open and edit natively.
 */

import type { ResumeDoc, SectionKey, TemplateId } from "@/lib/resume-studio/document";
import { SECTION_LABELS, docToPlainText, sectionIsEmpty } from "@/lib/resume-studio/document";

const PAGE = { w: 595.28, h: 841.89, margin: 48 };

type Font = { family: "helvetica" | "times" | "courier"; accentSize: number };

const FONTS: Record<TemplateId, Font> = {
  ats_classic: { family: "helvetica", accentSize: 20 },
  modern_professional: { family: "helvetica", accentSize: 24 },
  technical: { family: "courier", accentSize: 19 },
  minimal: { family: "helvetica", accentSize: 18 },
  executive: { family: "times", accentSize: 25 },
};

function safeName(name: string): string {
  return (name || "resume").replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "-") || "resume";
}

export async function downloadResumePdf(
  doc: ResumeDoc,
  order: SectionKey[],
  template: TemplateId,
  fileName: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const font = FONTS[template] ?? FONTS.ats_classic;
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const maxWidth = PAGE.w - PAGE.margin * 2;
  let y = PAGE.margin;

  const ensure = (needed: number) => {
    if (y + needed > PAGE.h - PAGE.margin) {
      pdf.addPage();
      y = PAGE.margin;
    }
  };

  const text = (
    value: string,
    opts: { size?: number; style?: "normal" | "bold" | "italic"; indent?: number; gap?: number } = {},
  ) => {
    const size = opts.size ?? 10;
    pdf.setFont(font.family, opts.style ?? "normal");
    pdf.setFontSize(size);
    const indent = opts.indent ?? 0;
    const lines = pdf.splitTextToSize(value, maxWidth - indent) as string[];
    for (const line of lines) {
      ensure(size + 3);
      pdf.text(line, PAGE.margin + indent, y);
      y += size + 3;
    }
    y += opts.gap ?? 0;
  };

  const rule = () => {
    ensure(8);
    pdf.setDrawColor(120);
    pdf.line(PAGE.margin, y, PAGE.w - PAGE.margin, y);
    y += 10;
  };

  // Header
  if (doc.header.fullName) text(doc.header.fullName, { size: font.accentSize, style: "bold" });
  if (doc.header.headline) text(doc.header.headline, { size: 11, style: "italic" });
  const contact = [doc.header.email, doc.header.phone, doc.header.location].filter(Boolean);
  if (contact.length) text(contact.join("  |  "), { size: 9 });
  if (doc.header.links.length) {
    text(doc.header.links.map((l) => l.url).join("  |  "), { size: 9, gap: 4 });
  }
  rule();

  for (const key of order) {
    if (sectionIsEmpty(doc, key)) continue;
    ensure(30);
    text(SECTION_LABELS[key].toUpperCase(), { size: 10.5, style: "bold", gap: 2 });

    if (key === "summary") text(doc.summary, { size: 10, gap: 6 });

    if (key === "experience") {
      for (const e of doc.experience) {
        const dates = [e.startDate, e.isCurrent ? "Present" : e.endDate].filter(Boolean).join(" - ");
        text([e.role, e.company].filter(Boolean).join(" | "), { size: 10.5, style: "bold" });
        const meta = [e.location, e.employmentType, dates].filter(Boolean).join(" | ");
        if (meta) text(meta, { size: 9, style: "italic" });
        for (const b of e.bullets) text(`•  ${b}`, { size: 10, indent: 10 });
        if (e.technologies.length) text(`Tech: ${e.technologies.join(", ")}`, { size: 9, indent: 10 });
        y += 6;
      }
    }

    if (key === "projects") {
      for (const p of doc.projects) {
        text(p.name, { size: 10.5, style: "bold" });
        if (p.description) text(p.description, { size: 10 });
        for (const b of p.bullets) text(`•  ${b}`, { size: 10, indent: 10 });
        if (p.technologies.length) text(`Tech: ${p.technologies.join(", ")}`, { size: 9, indent: 10 });
        const urls = [p.githubUrl, p.liveUrl].filter(Boolean);
        if (urls.length) text(urls.join("  |  "), { size: 9, indent: 10 });
        y += 6;
      }
    }

    if (key === "skills") {
      for (const g of doc.skills) {
        if (!g.items.length) continue;
        text(`${g.category}: ${g.items.join(", ")}`, { size: 10 });
      }
      y += 6;
    }

    if (key === "education") {
      for (const e of doc.education) {
        text([e.degree, e.fieldOfStudy].filter(Boolean).join(", "), { size: 10.5, style: "bold" });
        const meta = [e.institution, [e.startDate, e.endDate].filter(Boolean).join(" - "), e.grade]
          .filter(Boolean)
          .join(" | ");
        if (meta) text(meta, { size: 9, style: "italic" });
        y += 4;
      }
    }

    if (key === "certifications") {
      for (const c of doc.certifications) {
        text(
          [c.name, c.organization, c.issueDate].filter(Boolean).join(" — ") +
            (c.credentialUrl ? `  (${c.credentialUrl})` : ""),
          { size: 10 },
        );
      }
      y += 6;
    }

    if (key === "achievements") {
      for (const a of doc.achievements) text(`•  ${a}`, { size: 10, indent: 10 });
      y += 6;
    }

    if (key === "languages") {
      text(
        doc.languages.map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name)).join(", "),
        { size: 10, gap: 6 },
      );
    }
  }

  pdf.save(`${safeName(fileName)}.pdf`);
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function downloadResumeDocx(
  doc: ResumeDoc,
  order: SectionKey[],
  template: TemplateId,
  fileName: string,
): void {
  const serif = template === "executive";
  const parts: string[] = [];
  parts.push(`<h1 style="margin:0;font-size:22pt">${esc(doc.header.fullName)}</h1>`);
  if (doc.header.headline) parts.push(`<p style="margin:2pt 0;font-size:11pt">${esc(doc.header.headline)}</p>`);
  const contact = [doc.header.email, doc.header.phone, doc.header.location, ...doc.header.links.map((l) => l.url)]
    .filter(Boolean)
    .map(esc)
    .join(" | ");
  if (contact) parts.push(`<p style="margin:2pt 0;font-size:9.5pt;color:#444">${contact}</p>`);

  for (const key of order) {
    if (sectionIsEmpty(doc, key)) continue;
    parts.push(
      `<h2 style="margin:14pt 0 4pt;font-size:11pt;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #999">${esc(
        SECTION_LABELS[key],
      )}</h2>`,
    );
    if (key === "summary") parts.push(`<p style="margin:0;font-size:10.5pt">${esc(doc.summary)}</p>`);
    if (key === "experience") {
      for (const e of doc.experience) {
        const dates = [e.startDate, e.isCurrent ? "Present" : e.endDate].filter(Boolean).join(" – ");
        parts.push(
          `<p style="margin:6pt 0 0;font-size:11pt"><b>${esc(e.role)}</b>${
            e.company ? ` — ${esc(e.company)}` : ""
          }<span style="float:right">${esc(dates)}</span></p>`,
        );
        if (e.location || e.employmentType) {
          parts.push(
            `<p style="margin:0;font-size:9.5pt;color:#555">${esc(
              [e.location, e.employmentType].filter(Boolean).join(" · "),
            )}</p>`,
          );
        }
        if (e.bullets.length) {
          parts.push(
            `<ul style="margin:2pt 0 0 14pt;font-size:10.5pt">${e.bullets
              .map((b) => `<li>${esc(b)}</li>`)
              .join("")}</ul>`,
          );
        }
        if (e.technologies.length) {
          parts.push(`<p style="margin:2pt 0;font-size:9.5pt;color:#555">${esc(e.technologies.join(" · "))}</p>`);
        }
      }
    }
    if (key === "projects") {
      for (const p of doc.projects) {
        parts.push(`<p style="margin:6pt 0 0;font-size:11pt"><b>${esc(p.name)}</b></p>`);
        if (p.description) parts.push(`<p style="margin:0;font-size:10.5pt">${esc(p.description)}</p>`);
        if (p.bullets.length) {
          parts.push(
            `<ul style="margin:2pt 0 0 14pt;font-size:10.5pt">${p.bullets
              .map((b) => `<li>${esc(b)}</li>`)
              .join("")}</ul>`,
          );
        }
        const tail = [p.technologies.join(" · "), p.githubUrl, p.liveUrl].filter(Boolean).join(" | ");
        if (tail) parts.push(`<p style="margin:2pt 0;font-size:9.5pt;color:#555">${esc(tail)}</p>`);
      }
    }
    if (key === "skills") {
      for (const g of doc.skills) {
        if (!g.items.length) continue;
        parts.push(`<p style="margin:2pt 0;font-size:10.5pt"><b>${esc(g.category)}:</b> ${esc(g.items.join(", "))}</p>`);
      }
    }
    if (key === "education") {
      for (const e of doc.education) {
        parts.push(
          `<p style="margin:6pt 0 0;font-size:11pt"><b>${esc(
            [e.degree, e.fieldOfStudy].filter(Boolean).join(", "),
          )}</b></p>`,
        );
        parts.push(
          `<p style="margin:0;font-size:9.5pt;color:#555">${esc(
            [e.institution, [e.startDate, e.endDate].filter(Boolean).join(" – "), e.grade]
              .filter(Boolean)
              .join(" · "),
          )}</p>`,
        );
      }
    }
    if (key === "certifications") {
      parts.push(
        `<ul style="margin:2pt 0 0 14pt;font-size:10.5pt">${doc.certifications
          .map((c) => `<li>${esc([c.name, c.organization, c.issueDate].filter(Boolean).join(" — "))}</li>`)
          .join("")}</ul>`,
      );
    }
    if (key === "achievements") {
      parts.push(
        `<ul style="margin:2pt 0 0 14pt;font-size:10.5pt">${doc.achievements
          .map((a) => `<li>${esc(a)}</li>`)
          .join("")}</ul>`,
      );
    }
    if (key === "languages") {
      parts.push(
        `<p style="margin:0;font-size:10.5pt">${esc(
          doc.languages.map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name)).join(" · "),
        )}</p>`,
      );
    }
  }

  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(
    fileName,
  )}</title></head><body style="font-family:${serif ? "'Times New Roman',serif" : "Calibri,Arial,sans-serif"};color:#111">${parts.join(
    "",
  )}</body></html>`;

  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  triggerDownload(blob, `${safeName(fileName)}.doc`);
}

export function downloadResumeText(
  doc: ResumeDoc,
  order: SectionKey[],
  fileName: string,
): void {
  const blob = new Blob([docToPlainText(doc, order)], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, `${safeName(fileName)}.txt`);
}

function triggerDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
