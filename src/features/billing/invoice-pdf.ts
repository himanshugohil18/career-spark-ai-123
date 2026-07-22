import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceData } from "./invoice";
import { formatINR } from "./invoice";

const INR = (p: number) => "Rs. " + (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function generateInvoicePDF(inv: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = M;

  // Header: brand + invoice title
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(M, y, 34, 34, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("C", M + 17, y + 24, { align: "center" });

  doc.setTextColor(17, 17, 17);
  doc.setFontSize(16);
  doc.text(inv.company.name, M + 46, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(inv.company.tagline, M + 46, y + 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(17, 17, 17);
  doc.text("INVOICE", pageW - M, y + 18, { align: "right" });

  // Status pill
  const paid = inv.status === "captured" || inv.status === "paid";
  doc.setFillColor(paid ? 16 : 220, paid ? 185 : 38, paid ? 129 : 38);
  doc.roundedRect(pageW - M - 56, y + 26, 56, 16, 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(paid ? "PAID" : inv.status.toUpperCase(), pageW - M - 28, y + 37, { align: "center" });

  y += 60;
  doc.setDrawColor(230);
  doc.line(M, y, pageW - M, y);
  y += 18;

  // Invoice meta (left) + Company details (right)
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("INVOICE NUMBER", M, y);
  doc.text("ISSUED", M, y + 30);
  doc.text("PAYMENT DATE", M, y + 60);

  doc.setTextColor(17, 17, 17);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(inv.invoiceNumber, M, y + 14);
  doc.text(new Date(inv.issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), M, y + 44);
  doc.text(new Date(inv.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), M, y + 74);

  // Right column: company address
  const rx = pageW - M;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(inv.company.name, rx, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(inv.company.address, rx, y + 14, { align: "right" });
  doc.text(inv.company.email, rx, y + 28, { align: "right" });
  doc.text(inv.company.website.replace("https://", ""), rx, y + 42, { align: "right" });
  if (inv.company.gst) doc.text("GSTIN: " + inv.company.gst, rx, y + 56, { align: "right" });

  y += 100;

  // Billed To
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("BILLED TO", M, y);
  doc.setTextColor(17, 17, 17);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(inv.customer.full_name || inv.customer.email || "Customer", M, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (inv.customer.email) doc.text(inv.customer.email, M, y + 28);
  if (inv.customer.location) doc.text(inv.customer.location, M, y + 42);
  doc.setTextColor(150, 150, 150);
  doc.text("User ID: " + inv.customer.user_id.slice(0, 8) + "…", M, y + 56);

  // Payment details (right)
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text("PAYMENT DETAILS", rx, y, { align: "right" });
  doc.setTextColor(17, 17, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const rows = [
    ["Method", "Razorpay"],
    ["Order ID", inv.payment.order_id],
    ["Payment ID", inv.payment.payment_id ?? "—"],
  ];
  rows.forEach((r, i) => {
    doc.setTextColor(120, 120, 120);
    doc.text(r[0], rx - 180, y + 14 + i * 14);
    doc.setTextColor(17, 17, 17);
    doc.text(r[1], rx, y + 14 + i * 14, { align: "right" });
  });

  y += 82;

  // Line items table
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Description", "Qty", "Unit Price", "Amount"]],
    body: [
      [
        `CareerOS ${inv.plan.name} — Monthly subscription`,
        String(inv.amounts.quantity),
        INR(inv.amounts.unitPricePaise),
        INR(inv.amounts.subtotalPaise),
      ],
    ],
    styles: { fontSize: 10, cellPadding: 8, textColor: [17, 17, 17] },
    headStyles: { fillColor: [244, 244, 245], textColor: [80, 80, 80], fontStyle: "bold", fontSize: 9 },
    columnStyles: {
      1: { halign: "center", cellWidth: 50 },
      2: { halign: "right", cellWidth: 100 },
      3: { halign: "right", cellWidth: 100 },
    },
  });

  // Totals
  // @ts-expect-error jspdf-autotable adds lastAutoTable
  y = doc.lastAutoTable.finalY + 12;

  const totalsX = pageW - M - 220;
  const totalsW = 220;
  const drawRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 12 : 10);
    doc.setTextColor(bold ? 17 : 100, bold ? 17 : 100, bold ? 17 : 100);
    doc.text(label, totalsX, y);
    doc.setTextColor(17, 17, 17);
    doc.text(value, totalsX + totalsW, y, { align: "right" });
    y += bold ? 22 : 16;
  };

  drawRow("Subtotal", INR(inv.amounts.subtotalPaise));
  if (inv.amounts.discountPaise > 0) drawRow("Discount", "-" + INR(inv.amounts.discountPaise));
  drawRow("GST (18%)", INR(inv.amounts.taxPaise));
  doc.setDrawColor(230);
  doc.line(totalsX, y - 8, totalsX + totalsW, y - 8);
  drawRow("Total (INR)", INR(inv.amounts.grandTotalPaise), true);

  y += 8;
  // Features included
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 17, 17);
  doc.text("Included in " + inv.plan.name, M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const cols = 2;
  const colW = (pageW - M * 2) / cols;
  inv.features.slice(0, 10).forEach((f, i) => {
    const cx = M + (i % cols) * colW;
    const cy = y + Math.floor(i / cols) * 14;
    doc.setTextColor(16, 185, 129);
    doc.text("✓", cx, cy);
    doc.setTextColor(80, 80, 80);
    doc.text(f, cx + 12, cy);
  });
  y += Math.ceil(inv.features.slice(0, 10).length / cols) * 14 + 20;

  // Subscription block
  if (inv.subscription) {
    doc.setDrawColor(230);
    doc.line(M, y, pageW - M, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 17, 17);
    doc.text("Subscription", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const s = inv.subscription;
    const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
    const subLines = [
      ["Plan", inv.plan.name],
      ["Cycle", "Monthly"],
      ["Started", fmt(s.started_at)],
      ["Renews", fmt(s.expires_at)],
      ["Status", s.status],
    ];
    subLines.forEach((r, i) => {
      doc.text(r[0], M, y + i * 12);
      doc.setTextColor(17, 17, 17);
      doc.text(r[1], M + 120, y + i * 12);
      doc.setTextColor(80, 80, 80);
    });
    y += subLines.length * 12 + 12;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(230);
  doc.line(M, footerY, pageW - M, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Thank you for choosing CareerOS.", M, footerY + 16);
  doc.text("Questions? " + inv.company.supportEmail, M, footerY + 30);
  doc.text(inv.company.website.replace("https://", ""), pageW - M, footerY + 16, { align: "right" });
  doc.setTextColor(150, 150, 150);
  doc.text(inv.company.tagline, pageW - M, footerY + 30, { align: "right" });

  return doc;
}

export function downloadInvoicePDF(inv: InvoiceData) {
  const doc = generateInvoicePDF(inv);
  doc.save(`Invoice-${inv.invoiceNumber}.pdf`);
}

export function printInvoicePDF(inv: InvoiceData) {
  const doc = generateInvoicePDF(inv);
  doc.autoPrint();
  const url = doc.output("bloburl");
  window.open(url as unknown as string, "_blank");
}

export { formatINR };
