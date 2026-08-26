/**
 * Client-side resume export. PDF is generated with real, selectable text
 * (never a screenshot) so ATS parsers can read it. DOCX is a Word-compatible
 * HTML document, which Word/Google Docs open and edit natively.
 */

import type { ResumeDoc, SectionKey, TemplateId } from "@/lib/resume-studio/document";
import { SECTION_LABELS, docToPlainText, sectionIsEmpty } from "@/lib/resume-studio/document";

const PAGE = { w: 595.28, h: 841.89, marginX: 46, marginY: 42, footerY: 820 };

type Font = { family: "helvetica" | "times" | "courier"; nameSize: number; bodySize: number };

const FONTS: Record<TemplateId, Font> = {
  ats_classic: { family: "helvetica", nameSize: 20, bodySize: 9.8 },
  modern_professional: { family: "helvetica", nameSize: 23, bodySize: 10 },
  technical: { family: "courier", nameSize: 18, bodySize: 9.4 },
  minimal: { family: "helvetica", nameSize: 18, bodySize: 9.6 },
  executive: { family: "times", nameSize: 24, bodySize: 10.2 },
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
  const maxWidth = PAGE.w - PAGE.marginX * 2;
  const black: [number, number, number] = [28, 31, 36];
  const muted: [number, number, number] = [84, 91, 102];
  const rule: [number, number, number] = template === "modern_professional" ? [47, 92, 255] : [150, 156, 166];
  let y = PAGE.marginY;

  const lineHeight = (size: number) => Math.round(size * 1.34);
  const setTextColor = (rgb: [number, number, number]) => pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setDrawColor = (rgb: [number, number, number]) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);

  const addFooter = () => {
    const pages = pdf.getNumberOfPages();
    if (pages <= 1) return;
    for (let page = 1; page <= pages; page += 1) {
      pdf.setPage(page);
      pdf.setFont(font.family, "normal");
      pdf.setFontSize(7.5);
      setTextColor(muted);
      pdf.text(String(page), PAGE.w / 2, PAGE.footerY, { align: "center" });
    }
    pdf.setPage(pages);
  };

  const ensure = (needed: number) => {
    if (y + needed > PAGE.footerY - 12) {
      pdf.addPage();
      y = PAGE.marginY;
    }
  };

  const clean = (value: string) => value.replace(/[•]/g, "-").replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ").trim();

  const writeText = (
    value: string,
    opts: {
      size?: number;
      style?: "normal" | "bold" | "italic";
      indent?: number;
      gap?: number;
      color?: [number, number, number];
      width?: number;
      align?: "left" | "right" | "center";
    } = {},
  ) => {
    const normalized = clean(value);
    if (!normalized) return;
    const size = opts.size ?? font.bodySize;
    const indent = opts.indent ?? 0;
    const width = opts.width ?? maxWidth - indent;
    pdf.setFont(font.family, opts.style ?? "normal");
    pdf.setFontSize(size);
    setTextColor(opts.color ?? black);
    const lines = pdf.splitTextToSize(normalized, width) as string[];
    for (const line of lines) {
      ensure(lineHeight(size));
      const x = opts.align === "right" ? PAGE.w - PAGE.marginX : PAGE.marginX + indent;
      pdf.text(line, x, y, { align: opts.align ?? "left" });
      y += lineHeight(size);
    }
    y += opts.gap ?? 0;
  };

  const writeHeaderLine = (left: string, right: string) => {
    if (!left && !right) return;
    ensure(18);
    pdf.setFont(font.family, "bold");
    pdf.setFontSize(font.bodySize + 0.7);
    setTextColor(black);
    const rightWidth = right ? Math.min(140, pdf.getTextWidth(right) + 4) : 0;
    const leftLines = pdf.splitTextToSize(clean(left), maxWidth - rightWidth - 16) as string[];
    for (let i = 0; i < leftLines.length; i += 1) {
      ensure(lineHeight(font.bodySize + 0.7));
      pdf.text(leftLines[i] ?? "", PAGE.marginX, y);
      if (i === 0 && right) {
        pdf.setFont(font.family, "normal");
        pdf.setFontSize(8.8);
        setTextColor(muted);
        pdf.text(clean(right), PAGE.w - PAGE.marginX, y, { align: "right" });
        pdf.setFont(font.family, "bold");
        pdf.setFontSize(font.bodySize + 0.7);
        setTextColor(black);
      }
      y += lineHeight(font.bodySize + 0.7);
    }
  };

  const sectionTitle = (label: string) => {
    ensure(28);
    y += y > PAGE.marginY + 26 ? 7 : 0;
    pdf.setFont(font.family, "bold");
    pdf.setFontSize(9.5);
    setTextColor(black);
    pdf.text(label.toUpperCase(), PAGE.marginX, y);
    setDrawColor(rule);
    pdf.setLineWidth(template === "modern_professional" ? 1.1 : 0.7);
    pdf.line(PAGE.marginX, y + 5, PAGE.w - PAGE.marginX, y + 5);
    y += 15;
  };

  const bullet = (value: string) => {
    const body = clean(value);
    if (!body) return;
    writeText(`- ${body}`, { indent: 12, width: maxWidth - 12, gap: 1 });
  };

  if (doc.header.fullName) writeText(doc.header.fullName, { size: font.nameSize, style: "bold", gap: 1 });
  if (doc.header.headline) writeText(doc.header.headline, { size: 10.8, style: "italic", color: muted, gap: 2 });
  const contact = [doc.header.email, doc.header.phone, doc.header.location, ...doc.header.links.map((l) => l.url)].filter(Boolean);
  if (contact.length) writeText(contact.join("  |  "), { size: 8.6, color: muted, gap: 8 });
  setDrawColor(rule);
  pdf.setLineWidth(template === "modern_professional" ? 1.4 : 0.8);
  pdf.line(PAGE.marginX, y, PAGE.w - PAGE.marginX, y);
  y += 16;

  for (const key of order) {
    if (sectionIsEmpty(doc, key)) continue;
    sectionTitle(SECTION_LABELS[key]);

    if (key === "summary") writeText(doc.summary, { gap: 2 });

    if (key === "experience") {
      for (const e of doc.experience) {
        const dates = [e.startDate, e.isCurrent ? "Present" : e.endDate].filter(Boolean).join(" - ");
        writeHeaderLine([e.role, e.company].filter(Boolean).join(" — "), dates);
        const meta = [e.location, e.employmentType].filter(Boolean).join(" | ");
        if (meta) writeText(meta, { size: 8.8, style: "italic", color: muted, gap: 2 });
        for (const b of e.bullets) bullet(b);
        if (e.technologies.length) writeText(`Tech: ${e.technologies.join(", ")}`, { size: 8.7, indent: 12, color: muted });
        y += 5;
      }
    }

    if (key === "projects") {
      for (const p of doc.projects) {
        writeHeaderLine(p.name, "");
        if (p.description) writeText(p.description, { gap: 1 });
        for (const b of p.bullets) bullet(b);
        if (p.technologies.length) writeText(`Tech: ${p.technologies.join(", ")}`, { size: 8.7, indent: 12, color: muted });
        const urls = [p.githubUrl, p.liveUrl].filter(Boolean);
        if (urls.length) writeText(urls.join("  |  "), { size: 8.5, indent: 12, color: muted });
        y += 5;
      }
    }

    if (key === "skills") {
      for (const g of doc.skills) {
        if (!g.items.length) continue;
        writeText(`${g.category}: ${g.items.join(", ")}`, { gap: 1 });
      }
      y += 2;
    }

    if (key === "education") {
      for (const e of doc.education) {
        const dates = [e.startDate, e.endDate].filter(Boolean).join(" - ");
        writeHeaderLine([e.degree, e.fieldOfStudy].filter(Boolean).join(", "), dates);
        const meta = [e.institution, e.grade].filter(Boolean).join(" | ");
        if (meta) writeText(meta, { size: 8.8, style: "italic", color: muted });
        y += 4;
      }
    }

    if (key === "certifications") {
      for (const c of doc.certifications) {
        writeText(
          [c.name, c.organization, c.issueDate].filter(Boolean).join(" — ") +
            (c.credentialUrl ? `  (${c.credentialUrl})` : ""),
          { gap: 1 },
        );
      }
      y += 2;
    }

    if (key === "achievements") {
      for (const a of doc.achievements) bullet(a);
      y += 2;
    }

    if (key === "languages") {
      writeText(
        doc.languages.map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name)).join(", "),
        { gap: 2 },
      );
    }
  }

  addFooter();
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
