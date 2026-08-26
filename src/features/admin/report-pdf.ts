/**
 * Branded CareerOS admin PDF reporting engine.
 *
 * Produces real, laid-out documents (not text dumps): brand header band with
 * logo mark + wordmark, report meta (title, generated date/time, applied
 * filters), KPI cards, vector charts drawn natively with jsPDF, styled data
 * tables with repeating headers, and "Page X of Y" footers on every page.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = {
  blue: [47, 92, 255] as [number, number, number],
  ink: [17, 20, 28] as [number, number, number],
  muted: [110, 118, 134] as [number, number, number],
  line: [223, 227, 235] as [number, number, number],
  surface: [246, 248, 252] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
};

const PAGE = { w: 210, h: 297, m: 14 };
const CONTENT_W = PAGE.w - PAGE.m * 2;
const HEADER_H = 26;
const FOOTER_H = 14;

export type Kpi = { label: string; value: string; sub?: string; tone?: "default" | "good" | "bad" };
export type TableSpec = { title: string; columns: string[]; rows: (string | number)[][] };
export type ChartSeries = { key: string; label: string; color: [number, number, number] };
export type ChartSpec = {
  title: string;
  type: "line" | "bar";
  data: Array<Record<string, number | string>>;
  xKey: string;
  series: ChartSeries[];
  height?: number;
};
export type BarListSpec = {
  title: string;
  items: Array<{ label: string; value: number }>;
  color?: [number, number, number];
};

export type ReportSpec = {
  title: string;
  subtitle?: string;
  filters?: Record<string, string | number | undefined>;
  kpis?: Kpi[];
  charts?: ChartSpec[];
  barLists?: BarListSpec[];
  tables?: TableSpec[];
  filename: string;
};

class Report {
  doc: jsPDF;
  y = HEADER_H + 12;
  spec: ReportSpec;
  generated = new Date();

  constructor(spec: ReportSpec) {
    this.spec = spec;
    this.doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    this.doc.setFont("helvetica", "normal");
    this.drawHeader(true);
  }

  /* ---------------- chrome ---------------- */

  private drawHeader(first: boolean) {
    const d = this.doc;
    d.setFillColor(...BRAND.blue);
    d.rect(0, 0, PAGE.w, 3, "F");

    // logo mark
    d.setFillColor(...BRAND.blue);
    d.roundedRect(PAGE.m, 9, 9, 9, 1.6, 1.6, "F");
    d.setTextColor(255, 255, 255);
    d.setFont("helvetica", "bold");
    d.setFontSize(11);
    d.text("C", PAGE.m + 4.5, 15.4, { align: "center" });

    d.setTextColor(...BRAND.ink);
    d.setFontSize(13);
    d.text("CAREEROS", PAGE.m + 12.5, 14.2);
    d.setFont("helvetica", "normal");
    d.setFontSize(7);
    d.setTextColor(...BRAND.muted);
    d.text("ADMIN INTELLIGENCE REPORT", PAGE.m + 12.6, 18.4);

    d.setFontSize(8);
    d.setTextColor(...BRAND.muted);
    d.text(
      `${this.generated.toLocaleDateString()} · ${this.generated.toLocaleTimeString()}`,
      PAGE.w - PAGE.m,
      13.6,
      { align: "right" },
    );
    d.text("careerosai.site", PAGE.w - PAGE.m, 18, { align: "right" });

    d.setDrawColor(...BRAND.line);
    d.setLineWidth(0.3);
    d.line(PAGE.m, HEADER_H - 3, PAGE.w - PAGE.m, HEADER_H - 3);

    if (first) {
      this.y = HEADER_H + 4;
      d.setFont("helvetica", "bold");
      d.setFontSize(19);
      d.setTextColor(...BRAND.ink);
      d.text(this.spec.title, PAGE.m, this.y + 6);
      this.y += 11;
      if (this.spec.subtitle) {
        d.setFont("helvetica", "normal");
        d.setFontSize(9.5);
        d.setTextColor(...BRAND.muted);
        const lines = d.splitTextToSize(this.spec.subtitle, CONTENT_W);
        d.text(lines, PAGE.m, this.y + 4);
        this.y += 4 + lines.length * 4.6;
      }
      const filters = Object.entries(this.spec.filters ?? {}).filter(([, v]) => v !== undefined && v !== "");
      if (filters.length) {
        this.y += 2;
        const h = 9;
        d.setFillColor(...BRAND.surface);
        d.setDrawColor(...BRAND.line);
        d.rect(PAGE.m, this.y, CONTENT_W, h, "FD");
        d.setFontSize(8);
        d.setTextColor(...BRAND.muted);
        d.text(
          `FILTERS   ${filters.map(([k, v]) => `${k}: ${v}`).join("    ·    ")}`,
          PAGE.m + 3,
          this.y + 5.8,
        );
        this.y += h + 4;
      } else {
        this.y += 3;
      }
    } else {
      this.y = HEADER_H + 4;
    }
  }

  private need(h: number) {
    if (this.y + h > PAGE.h - FOOTER_H) {
      this.doc.addPage();
      this.drawHeader(false);
    }
  }

  sectionTitle(text: string) {
    this.need(14);
    const d = this.doc;
    d.setFont("helvetica", "bold");
    d.setFontSize(11);
    d.setTextColor(...BRAND.ink);
    d.text(text.toUpperCase(), PAGE.m, this.y + 4);
    d.setDrawColor(...BRAND.blue);
    d.setLineWidth(0.8);
    d.line(PAGE.m, this.y + 6.2, PAGE.m + 16, this.y + 6.2);
    this.y += 11;
  }

  /* ---------------- blocks ---------------- */

  kpis(items: Kpi[]) {
    if (!items.length) return;
    const d = this.doc;
    const perRow = 3;
    const gap = 4;
    const cw = (CONTENT_W - gap * (perRow - 1)) / perRow;
    const ch = 20;
    items.forEach((k, i) => {
      if (i % perRow === 0) this.need(ch + 4);
      const col = i % perRow;
      const x = PAGE.m + col * (cw + gap);
      const yy = this.y;
      d.setFillColor(...BRAND.surface);
      d.setDrawColor(...BRAND.line);
      d.setLineWidth(0.25);
      d.rect(x, yy, cw, ch, "FD");
      d.setFillColor(
        ...(k.tone === "good" ? BRAND.green : k.tone === "bad" ? BRAND.red : BRAND.blue),
      );
      d.rect(x, yy, 1.2, ch, "F");
      d.setFont("helvetica", "normal");
      d.setFontSize(7);
      d.setTextColor(...BRAND.muted);
      d.text(k.label.toUpperCase(), x + 4, yy + 6);
      d.setFont("helvetica", "bold");
      d.setFontSize(14);
      d.setTextColor(...BRAND.ink);
      d.text(String(k.value), x + 4, yy + 13.4);
      if (k.sub) {
        d.setFont("helvetica", "normal");
        d.setFontSize(7);
        d.setTextColor(...BRAND.muted);
        d.text(k.sub, x + 4, yy + 17.6);
      }
      if (col === perRow - 1 || i === items.length - 1) this.y += ch + gap;
    });
    this.y += 2;
  }

  chart(spec: ChartSpec) {
    const h = spec.height ?? 52;
    this.need(h + 22);
    const d = this.doc;
    this.sectionTitle(spec.title);

    const x0 = PAGE.m + 12;
    const y0 = this.y;
    const w = CONTENT_W - 14;
    const plotH = h;

    const values = spec.data.flatMap((row) => spec.series.map((s) => Number(row[s.key]) || 0));
    const max = Math.max(1, ...values);
    const niceMax = Math.ceil(max / 5) * 5 || 1;

    // grid + y labels
    d.setDrawColor(...BRAND.line);
    d.setLineWidth(0.15);
    d.setFontSize(6.5);
    d.setTextColor(...BRAND.muted);
    for (let i = 0; i <= 4; i++) {
      const gy = y0 + plotH - (plotH * i) / 4;
      d.line(x0, gy, x0 + w, gy);
      d.text(String(Math.round((niceMax * i) / 4)), x0 - 2, gy + 1.5, { align: "right" });
    }

    const n = Math.max(1, spec.data.length);
    const step = w / n;

    if (spec.type === "bar") {
      const bw = Math.max(0.8, (step * 0.62) / spec.series.length);
      spec.data.forEach((row, i) => {
        spec.series.forEach((s, si) => {
          const v = Number(row[s.key]) || 0;
          const bh = (v / niceMax) * plotH;
          d.setFillColor(...s.color);
          d.rect(x0 + i * step + step * 0.19 + si * bw, y0 + plotH - bh, bw, bh, "F");
        });
      });
    } else {
      spec.series.forEach((s) => {
        d.setDrawColor(...s.color);
        d.setLineWidth(0.6);
        let prev: [number, number] | null = null;
        spec.data.forEach((row, i) => {
          const v = Number(row[s.key]) || 0;
          const px = x0 + i * step + step / 2;
          const py = y0 + plotH - (v / niceMax) * plotH;
          if (prev) d.line(prev[0], prev[1], px, py);
          prev = [px, py];
        });
      });
    }

    // x axis labels (thinned)
    d.setDrawColor(...BRAND.line);
    d.setLineWidth(0.3);
    d.line(x0, y0 + plotH, x0 + w, y0 + plotH);
    d.setFontSize(6);
    d.setTextColor(...BRAND.muted);
    const every = Math.ceil(n / 12);
    spec.data.forEach((row, i) => {
      if (i % every !== 0) return;
      d.text(String(row[spec.xKey] ?? ""), x0 + i * step + step / 2, y0 + plotH + 4, {
        align: "center",
      });
    });

    // legend
    let lx = x0;
    const ly = y0 + plotH + 9;
    d.setFontSize(7);
    spec.series.forEach((s) => {
      d.setFillColor(...s.color);
      d.rect(lx, ly - 2, 3, 3, "F");
      d.setTextColor(...BRAND.muted);
      d.text(s.label, lx + 4.5, ly + 0.6);
      lx += 6 + d.getTextWidth(s.label);
    });

    this.y = ly + 7;
  }

  barList(spec: BarListSpec) {
    const items = spec.items.slice(0, 12);
    this.need(items.length * 6 + 18);
    const d = this.doc;
    this.sectionTitle(spec.title);
    const max = Math.max(1, ...items.map((i) => i.value));
    const labelW = 46;
    const barW = CONTENT_W - labelW - 20;
    items.forEach((it) => {
      this.need(7);
      const yy = this.y;
      d.setFontSize(8);
      d.setTextColor(...BRAND.ink);
      d.text(d.splitTextToSize(it.label, labelW)[0], PAGE.m, yy + 3.4);
      d.setFillColor(...BRAND.surface);
      d.rect(PAGE.m + labelW, yy, barW, 4.2, "F");
      d.setFillColor(...(spec.color ?? BRAND.blue));
      d.rect(PAGE.m + labelW, yy, Math.max(0.6, (it.value / max) * barW), 4.2, "F");
      d.setFontSize(7.5);
      d.setTextColor(...BRAND.muted);
      d.text(it.value.toLocaleString(), PAGE.m + labelW + barW + 2, yy + 3.4);
      this.y += 6;
    });
    this.y += 3;
  }

  table(spec: TableSpec) {
    this.need(24);
    this.sectionTitle(spec.title);
    autoTable(this.doc, {
      head: [spec.columns],
      body: spec.rows.length ? spec.rows.map((r) => r.map((c) => (c === null || c === undefined ? "—" : String(c)))) : [spec.columns.map(() => "—")],
      startY: this.y,
      margin: { left: PAGE.m, right: PAGE.m, top: HEADER_H + 4, bottom: FOOTER_H },
      styles: { font: "helvetica", fontSize: 7.6, cellPadding: 1.8, textColor: BRAND.ink, lineColor: BRAND.line, lineWidth: 0.1 },
      headStyles: { fillColor: BRAND.blue, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.6 },
      alternateRowStyles: { fillColor: BRAND.surface },
      showHead: "everyPage",
      didDrawPage: () => {
        /* header is re-drawn below in finalize pass */
      },
    });
    // @ts-expect-error autotable augments the doc
    this.y = (this.doc.lastAutoTable?.finalY ?? this.y) + 6;
  }

  finalize() {
    const d = this.doc;
    const pages = d.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      d.setPage(p);
      // ensure every page (including autotable-created ones) has the brand band
      d.setFillColor(...BRAND.blue);
      d.rect(0, 0, PAGE.w, 3, "F");
      d.setDrawColor(...BRAND.line);
      d.setLineWidth(0.3);
      d.line(PAGE.m, PAGE.h - FOOTER_H + 2, PAGE.w - PAGE.m, PAGE.h - FOOTER_H + 2);
      d.setFont("helvetica", "normal");
      d.setFontSize(7.5);
      d.setTextColor(...BRAND.muted);
      d.text("CareerOS · Confidential admin report", PAGE.m, PAGE.h - FOOTER_H + 7);
      d.text(this.spec.title, PAGE.w / 2, PAGE.h - FOOTER_H + 7, { align: "center" });
      d.text(`Page ${p} of ${pages}`, PAGE.w - PAGE.m, PAGE.h - FOOTER_H + 7, { align: "right" });
    }
    return d;
  }
}

/** Build the report document (used by download + tests). */
export function buildAdminReport(spec: ReportSpec): jsPDF {
  const r = new Report(spec);
  if (spec.kpis?.length) {
    r.sectionTitle("Key metrics");
    r.kpis(spec.kpis);
  }
  for (const c of spec.charts ?? []) r.chart(c);
  for (const b of spec.barLists ?? []) r.barList(b);
  for (const t of spec.tables ?? []) r.table(t);
  return r.finalize();
}

/** Build and save the branded PDF in the browser. */
export function downloadAdminReport(spec: ReportSpec) {
  const doc = buildAdminReport(spec);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  doc.save(spec.filename.replace(/\.pdf$/, "") + `-${stamp}.pdf`);
}

export const CHART_COLORS: Record<string, [number, number, number]> = {
  blue: BRAND.blue,
  green: BRAND.green,
  amber: BRAND.amber,
  red: BRAND.red,
  ink: BRAND.ink,
};
