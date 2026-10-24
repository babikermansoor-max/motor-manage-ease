import { downloadBlob, num } from "@/lib/format";

/** Generic professional report exports (Excel .xlsx + A4 PDF) shared by reports and inventory. */
export type Cell = string | number;
export interface Section {
  title: string;
  head: string[];
  rows: Cell[][];
  /** column indexes (0-based) that hold numbers; formatted with thousands separators */
  numCols?: number[];
  /** column indexes summed in a final totals row (Excel uses SUM formulas) */
  sumCols?: number[];
  /** per-row tone for highlighting */
  tone?: (rowIndex: number) => "danger" | "warn" | undefined;
  /** Excel formula for a column, given the Excel row number; value in rows is used as cached result */
  formulas?: Record<number, (r: number) => string>;
  widths?: number[];
}
export interface DocMeta { title: string; storeName: string; subtitle: string; phone: string; address?: string; footer?: string; info: [string, string][]; kpis?: [string, string][] }

const C = { dark: "0F172A", green: "059669", greenLight: "D1FAE5", gray: "F8FAFC", border: "CBD5E1", danger: "FEE2E2", warn: "FEF3C7" };
const colL = (i: number) => String.fromCharCode(65 + i);

export async function excelReport(fileName: string, meta: DocMeta, sections: Section[]): Promise<File> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = meta.storeName;
  const ws = wb.addWorksheet(meta.title.slice(0, 30), { views: [{ rightToLeft: true, showGridLines: false }], pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const cols = Math.max(4, ...sections.map((s) => s.head.length));
  const widths = Array.from({ length: cols }, (_, i) => Math.max(...sections.map((s) => s.widths?.[i] ?? (i === 0 ? 8 : 18))));
  ws.columns = widths.map((width) => ({ width }));
  const fill = (c: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF" + c } });
  const thin = { style: "thin" as const, color: { argb: "FF" + C.border } };
  const box = { top: thin, bottom: thin, left: thin, right: thin };
  const font = (o: Record<string, unknown> = {}) => ({ name: "Arial", size: 11, ...o });
  const band = (r: number, text: string, size: number, color: string, bg: string, h: number, bold = false) => {
    ws.mergeCells(r, 1, r, cols);
    const c = ws.getCell(r, 1);
    c.value = text; c.font = font({ size, bold, color: { argb: "FF" + color } }); c.fill = fill(bg);
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; ws.getRow(r).height = h;
  };
  band(1, meta.storeName, 16, "FFFFFF", C.dark, 32, true);
  band(2, meta.subtitle, 11, "FFFFFF", C.dark, 20);
  band(3, [meta.address, `هاتف: ${meta.phone}`].filter(Boolean).join("  |  "), 10, "FFFFFF", C.green, 20);
  band(5, meta.title, 15, C.green, "FFFFFF", 28, true);
  let r = 6;
  for (const [k, v] of meta.info) {
    ws.mergeCells(r, 2, r, cols);
    const a = ws.getCell(r, 1), b = ws.getCell(r, 2);
    a.value = k; b.value = v;
    a.font = font({ bold: true, color: { argb: "FF334155" } }); a.fill = fill("F1F5F9"); b.font = font();
    for (const x of [a, b]) { x.border = box; x.alignment = { horizontal: "right", vertical: "middle" }; }
    r++;
  }
  ws.getColumn(1).width = Math.max(widths[0], 22);

  for (const s of sections) {
    r += 1;
    band(r, s.title, 12, "FFFFFF", C.dark, 24, true); r++;
    s.head.forEach((h, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = h; c.font = font({ bold: true, color: { argb: "FFFFFFFF" } }); c.fill = fill(C.green);
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; c.border = box;
    });
    ws.getRow(r).height = 24;
    if (s === sections[0] && sections.length === 1) ws.views = [{ rightToLeft: true, showGridLines: false, state: "frozen", ySplit: r }];
    const first = r + 1;
    s.rows.forEach((row, idx) => {
      r++;
      const tone = s.tone?.(idx);
      row.forEach((v, i) => {
        const c = ws.getCell(r, i + 1);
        const f = s.formulas?.[i];
        c.value = (f ? { formula: f(r), result: v } : v) as never;
        c.border = box; c.font = font({ color: { argb: tone === "danger" ? "FFB91C1C" : "FF0F172A" } });
        c.fill = fill(tone === "danger" ? C.danger : tone === "warn" ? C.warn : idx % 2 ? C.gray : "FFFFFF");
        c.alignment = { horizontal: s.numCols?.includes(i) ? "center" : "right", vertical: "middle", wrapText: true };
        if (s.numCols?.includes(i)) c.numFmt = "#,##0;(#,##0);-";
      });
    });
    const last = r;
    if (s.sumCols?.length && s.rows.length) {
      r++;
      for (let i = 0; i < s.head.length; i++) {
        const c = ws.getCell(r, i + 1);
        if (i === 0) c.value = "الإجمالي";
        else if (s.sumCols.includes(i)) {
          const L = colL(i);
          c.value = { formula: `SUM(${L}${first}:${L}${last})`, result: s.rows.reduce((a, x) => a + (Number(x[i]) || 0), 0) } as never;
          c.numFmt = "#,##0;(#,##0);-";
        }
        c.font = font({ bold: true, color: { argb: "FFFFFFFF" } }); c.fill = fill(C.dark); c.border = box;
        c.alignment = { horizontal: i === 0 ? "right" : "center", vertical: "middle" };
      }
      ws.getRow(r).height = 22;
    }
  }
  r += 2;
  band(r, `${meta.footer ?? ""}\nتم الاستخراج بتاريخ ${new Date().toLocaleString("ar-EG")}`, 9, "64748B", "FFFFFF", 34);
  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const esc = (t: Cell) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function sectionHtml(s: Section) {
  const fmt = (v: Cell, i: number) => (s.numCols?.includes(i) && typeof v === "number" ? num(v) : esc(v));
  const rows = s.rows.map((row, idx) => {
    const t = s.tone?.(idx);
    const bg = t === "danger" ? "#fee2e2" : t === "warn" ? "#fef3c7" : idx % 2 ? "#f8fafc" : "#fff";
    return `<tr style="background:${bg}">${row.map((v, i) => `<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:${s.numCols?.includes(i) ? "center" : "right"};${t === "danger" ? "color:#b91c1c;" : ""}">${fmt(v, i)}</td>`).join("")}</tr>`;
  }).join("");
  const total = s.sumCols?.length && s.rows.length
    ? `<tr style="background:#0f172a;color:#fff;font-weight:800">${s.head.map((_, i) => `<td style="padding:8px;text-align:${i ? "center" : "right"}">${i === 0 ? "الإجمالي" : s.sumCols!.includes(i) ? num(s.rows.reduce((a, x) => a + (Number(x[i]) || 0), 0)) : ""}</td>`).join("")}</tr>` : "";
  return `<div style="margin-top:22px;break-inside:avoid">
    <div style="font-size:15px;font-weight:800;margin-bottom:8px;padding-right:10px;border-right:4px solid #059669">${esc(s.title)}</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e2e8f0">
      <thead><tr style="background:#059669;color:#fff">${s.head.map((h, i) => `<th style="padding:8px;text-align:${s.numCols?.includes(i) ? "center" : "right"}">${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${s.head.length}" style="padding:14px;text-align:center;color:#64748b">لا توجد بيانات</td></tr>`}${total}</tbody>
    </table></div>`;
}

function docHtml(meta: DocMeta, sections: Section[]) {
  const kpis = meta.kpis?.length ? `<div style="display:flex;gap:10px;margin-top:18px">${meta.kpis.map(([k, v]) => `<div style="flex:1;padding:12px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0"><div style="font-size:11px;color:#475569">${esc(k)}</div><div style="font-size:16px;font-weight:800;color:#065f46;margin-top:4px">${esc(v)}</div></div>`).join("")}</div>` : "";
  return `<div style="width:794px;box-sizing:border-box;background:#fff;color:#0f172a;font-family:Cairo,Tajawal,Arial,sans-serif;direction:rtl">
    <div style="background:#0f172a;color:#fff;padding:24px 36px;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:20px;font-weight:800">${esc(meta.storeName)}</div><div style="font-size:12px;opacity:.85;margin-top:4px">${esc(meta.subtitle)}</div>
      <div style="font-size:11px;opacity:.7;margin-top:6px">${esc(meta.address ?? "")}${meta.address ? " · " : ""}هاتف: <span style="direction:ltr;unicode-bidi:embed">${esc(meta.phone)}</span></div></div>
      <div style="text-align:left;font-size:22px;font-weight:800;color:#34d399;max-width:260px">${esc(meta.title)}</div>
    </div>
    <div style="height:6px;background:linear-gradient(90deg,#059669,#fbbf24)"></div>
    <div style="padding:22px 36px 30px">
      <div style="display:flex;flex-wrap:wrap;gap:8px">${meta.info.map(([k, v]) => `<div style="flex:1;min-width:30%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc"><div style="font-size:10px;color:#64748b">${esc(k)}</div><div style="font-size:13px;font-weight:700;margin-top:2px">${esc(v)}</div></div>`).join("")}</div>
      ${kpis}${sections.map(sectionHtml).join("")}
      <div style="display:flex;justify-content:space-between;margin-top:50px;font-size:12px;color:#475569">
        <div style="text-align:center;width:200px;border-top:1px solid #94a3b8;padding-top:6px">إعداد / المحاسب</div>
        <div style="text-align:center;width:200px;border-top:1px solid #94a3b8;padding-top:6px">اعتماد الإدارة والختم</div>
      </div>
    </div>
    <div style="padding:12px 36px;border-top:3px solid #059669;background:#f8fafc;text-align:center;font-size:11px;color:#475569">${esc(meta.footer ?? "")} — تم الاستخراج ${esc(new Date().toLocaleString("ar-EG"))}</div>
  </div>`;
}

export async function pdfReport(fileName: string, meta: DocMeta, sections: Section[]): Promise<File> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;z-index:-1";
  host.innerHTML = docHtml(meta, sections);
  document.body.appendChild(host);
  try {
    await document.fonts?.ready;
    const el = host.firstElementChild as HTMLElement;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pw = 210, ph = 297;
    const pagePx = Math.floor((canvas.width * ph) / pw);
    // Slice the canvas per page, breaking only between table rows to avoid cut-through text.
    const scale = canvas.width / el.offsetWidth;
    const elTop = el.getBoundingClientRect().top;
    const breaks = [...el.querySelectorAll("tr, .avoid")].map((n) => Math.round((n.getBoundingClientRect().bottom - elTop) * scale));
    let y = 0, page = 0;
    while (y < canvas.height - 4) {
      let end = Math.min(y + pagePx, canvas.height);
      if (end < canvas.height) { const b = breaks.filter((v) => v > y + pagePx * 0.5 && v <= end).pop(); if (b) end = b; }
      const slice = document.createElement("canvas");
      slice.width = canvas.width; slice.height = end - y;
      slice.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, end - y, 0, 0, canvas.width, end - y);
      if (page++) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pw, ((end - y) * pw) / canvas.width);
      pdf.setFontSize(8); pdf.setTextColor(120); pdf.text(`${page}`, pw / 2, ph - 5, { align: "center" });
      y = end;
    }
    return new File([pdf.output("blob")], fileName, { type: "application/pdf" });
  } finally { host.remove(); }
}

export async function shareFile(file: File, title: string) {
  downloadBlob(file.name, file);
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  if (touch && nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title }); } catch { /* الملف تم تنزيله مسبقاً */ }
  }
}
