const nf = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 });
export const num = (n: number) => nf.format(n || 0);
export const money = (n: number, cur = "ج.س") => `${nf.format(Math.round(n || 0))} ${cur}`;
export const dateTime = (iso: string) => new Date(iso).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
export const dateOnly = (iso: string) => new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}
export function downloadBlob(filename: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
