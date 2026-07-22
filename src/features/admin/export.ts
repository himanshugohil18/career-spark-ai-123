import * as XLSX from "xlsx";

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    downloadBlob(filename, new Blob(["(no rows)"], { type: "text/csv" }));
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function downloadXLSX(filename: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ empty: true }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Export");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(filename, new Blob([buf], { type: "application/octet-stream" }));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
