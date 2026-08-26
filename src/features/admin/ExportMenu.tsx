import { useState } from "react";
import { Download, FileText, Table2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadAdminReport, type ReportSpec } from "./report-pdf";
import { downloadCSV, downloadXLSX } from "./export";
import { toast } from "sonner";

/**
 * Report toolbar shown on every admin page. The PDF button produces the
 * branded multi-page report; CSV/XLSX are offered when raw rows are available.
 */
export function ExportBar({
  title,
  description,
  buildReport,
  rows,
  filenameBase,
  extra,
}: {
  title: string;
  description?: string;
  buildReport: () => ReportSpec | null;
  rows?: Record<string, unknown>[];
  filenameBase: string;
  extra?: React.ReactNode;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const runPdf = async () => {
    setBusy("pdf");
    try {
      const spec = buildReport();
      if (!spec) {
        toast.error("Report data is still loading");
        return;
      }
      downloadAdminReport(spec);
      toast.success("PDF report downloaded");
    } catch (e) {
      toast.error((e as Error).message || "Could not build the PDF");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        <Button size="sm" onClick={runPdf} disabled={busy === "pdf"}>
          {busy === "pdf" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
          Export PDF
        </Button>
        {rows ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                downloadCSV(`${filenameBase}.csv`, rows);
                toast.success("CSV downloaded");
              }}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                downloadXLSX(`${filenameBase}.xlsx`, rows);
                toast.success("Excel downloaded");
              }}
            >
              <Table2 className="h-3.5 w-3.5" />
              Excel
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
