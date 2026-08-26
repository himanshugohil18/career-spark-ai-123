import { jsPDF } from "jspdf";

type Turn = {
  turn_index: number;
  question: string;
  answer: string | null;
  score: number | null;
  feedback: string | null;
  points_hit: string[] | null;
  points_missed: string[] | null;
  difficulty: string | null;
  focus_area: string | null;
  model_answer: string | null;
};

type Session = {
  target_role: string;
  target_company?: string | null;
  interview_type?: string | null;
  mode?: string | null;
  difficulty?: string | null;
  planned_questions: number;
  answered_questions: number;
  overall_score: number | null;
  feedback_summary: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  created_at?: string | null;
};

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const M = 54; // margin
const CONTENT_W = PAGE_W - M * 2;
const INK: [number, number, number] = [24, 26, 32];
const MUTED: [number, number, number] = [110, 116, 128];
const BRAND: [number, number, number] = [47, 92, 255];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "interview";
}

export function buildInterviewReportPdf(session: Session, turns: Turn[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = M;

  const newPage = () => {
    doc.addPage();
    y = M;
  };
  const need = (h: number) => {
    if (y + h > PAGE_H - M - 24) newPage();
  };

  const text = (
    value: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number; indent?: number } = {},
  ) => {
    const size = opts.size ?? 10.5;
    const lh = size * 1.42;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? INK));
    const indent = opts.indent ?? 0;
    const lines = doc.splitTextToSize(value, CONTENT_W - indent) as string[];
    for (const line of lines) {
      need(lh);
      doc.text(line, M + indent, y + size * 0.92);
      y += lh;
    }
    y += opts.gap ?? 0;
  };

  const rule = (gap = 10) => {
    need(gap + 2);
    doc.setDrawColor(226, 229, 235);
    doc.setLineWidth(0.8);
    doc.line(M, y, PAGE_W - M, y);
    y += gap;
  };

  const heading = (label: string) => {
    need(30);
    y += 6;
    text(label.toUpperCase(), { size: 9, bold: true, color: BRAND, gap: 2 });
  };

  const bullets = (items: string[], marker = "•") => {
    for (const item of items) {
      const size = 10.5;
      const lh = size * 1.42;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(item, CONTENT_W - 16) as string[];
      lines.forEach((line, i) => {
        need(lh);
        if (i === 0) {
          doc.setTextColor(...MUTED);
          doc.text(marker, M, y + size * 0.92);
          doc.setTextColor(...INK);
        }
        doc.text(line, M + 16, y + size * 0.92);
        y += lh;
      });
    }
  };

  // ---- Header ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text("Interview Report", M, y + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND);
  doc.text("CAREEROS", PAGE_W - M, y + 18, { align: "right" });
  y += 34;

  const meta = [
    session.target_role,
    session.target_company || null,
    String(session.interview_type ?? "mixed").replace(/_/g, " ") + " round",
    session.mode === "teacher" ? "teacher mode" : "real interview mode",
    `${session.answered_questions}/${session.planned_questions} questions answered`,
    session.created_at ? new Date(session.created_at).toLocaleDateString() : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  text(meta, { size: 9.5, color: MUTED, gap: 6 });
  rule(14);

  // ---- Score + summary ----
  if (session.overall_score != null) {
    need(46);
    doc.setFillColor(240, 244, 255);
    doc.rect(M, y, 92, 40, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...BRAND);
    doc.text(`${Number(session.overall_score).toFixed(1)}`, M + 14, y + 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("/ 10 overall", M + 50, y + 28);
    y += 54;
  }

  if (session.feedback_summary) {
    heading("Debrief");
    text(session.feedback_summary, { gap: 6 });
  }

  if (session.strengths?.length) {
    heading("Strengths");
    bullets(session.strengths);
    y += 6;
  }
  if (session.improvements?.length) {
    heading("Work on next");
    bullets(session.improvements);
    y += 6;
  }

  // ---- Question by question ----
  const answered = turns
    .filter((t) => t.answer != null)
    .sort((a, b) => a.turn_index - b.turn_index);

  if (answered.length) {
    rule(14);
    heading("Question by question");
    for (const t of answered) {
      need(70);
      y += 6;
      const label = [
        `Q${t.turn_index + 1}`,
        t.focus_area || null,
        t.difficulty || null,
        t.score != null ? `${Number(t.score).toFixed(1)}/10` : null,
      ]
        .filter(Boolean)
        .join("  ·  ");
      text(label, { size: 8.5, bold: true, color: MUTED, gap: 1 });
      text(t.question, { size: 11.5, bold: true, gap: 4 });

      if (t.answer) {
        text("Your answer", { size: 8.5, bold: true, color: MUTED, gap: 1 });
        text(t.answer, { gap: 4 });
      }
      if (t.feedback) {
        text("Coach feedback", { size: 8.5, bold: true, color: MUTED, gap: 1 });
        text(t.feedback, { gap: 4 });
      }
      if (t.points_hit?.length) {
        text("What worked", { size: 8.5, bold: true, color: MUTED, gap: 1 });
        bullets(t.points_hit, "+");
        y += 4;
      }
      if (t.points_missed?.length) {
        text("What was missing", { size: 8.5, bold: true, color: MUTED, gap: 1 });
        bullets(t.points_missed, "-");
        y += 4;
      }
      if (t.model_answer) {
        text("Model answer", { size: 8.5, bold: true, color: MUTED, gap: 1 });
        text(t.model_answer, { gap: 4 });
      }
      rule(8);
    }
  }

  // ---- Footers ----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Generated by CareerOS", M, PAGE_H - 28);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - M, PAGE_H - 28, { align: "right" });
  }

  const name = `careeros-interview-report-${slug(session.target_role)}${
    session.target_company ? `-${slug(session.target_company)}` : ""
  }.pdf`;
  return { doc, name };
}

export function downloadInterviewReportPdf(session: Session, turns: Turn[]) {
  const { doc, name } = buildInterviewReportPdf(session, turns);
  doc.save(name);
}
