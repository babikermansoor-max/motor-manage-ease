import { PAY_LABEL, type Sale } from "@/lib/store";
import { dateTime, downloadBlob, money, num } from "@/lib/format";

type StoreInfo = { storeName: string; subtitle: string; phone: string; address?: string; currency: string; footer: string };

// Brand palette used only inside exported documents (files are viewed outside the app theme).
const BRAND = { dark: "0F172A", green: "059669", greenLight: "D1FAE5", amber: "F59E0B", gray: "F1F5F9", border: "CBD5E1" };

export async function invoiceExcel(s: Sale, st: StoreInfo): Promise<File> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = st.storeName;
  const ws = wb.addWorksheet("فاتورة", { views: [{ rightToLeft: true, showGridLines: false }], pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [{ width: 6 }, { width: 34 }, { width: 18 }, { width: 10 }, { width: 16 }, { width: 18 }];
  const fill = (c: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF" + c } });
  const thin = { style: "thin" as const, color: { argb: "FF" + BRAND.border } };
  const box = { top: thin, bottom: thin, left: thin, right: thin };
  const font = (o: Record<string, unknown> = {}) => ({ name: "Arial", size: 11, ...o });
  const numFmt = "#,##0";

  const band = (r: number, text: string, opts: { size: number; bold?: boolean; color: string; bg: string; h: number }) => {
    ws.mergeCells(r, 1, r, 6);
    const c = ws.getCell(r, 1);
    c.value = text; c.font = font({ size: opts.size, bold: opts.bold, color: { argb: "FF" + opts.color } });
    c.fill = fill(opts.bg); c.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(r).height = opts.h;
  };
  band(1, st.storeName, { size: 16, bold: true, color: "FFFFFF", bg: BRAND.dark, h: 32 });
  band(2, st.subtitle, { size: 11, color: "FFFFFF", bg: BRAND.dark, h: 20 });
  band(3, [st.address, `هاتف: ${st.phone}`].filter(Boolean).join("  |  "), { size: 10, color: "FFFFFF", bg: BRAND.green, h: 20 });
  band(5, s.returned ? "فاتورة مبيعات (مرتجعة)" : "فاتورة مبيعات", { size: 14, bold: true, color: BRAND.green, bg: "FFFFFF", h: 26 });

  const info: [string, string, string, string][] = [
    ["رقم الفاتورة", `#${s.no}`, "التاريخ", dateTime(s.date)],
    ["العميل", s.customerName, "الكاشير", s.cashier],
    ["طريقة الدفع", PAY_LABEL[s.method], "الحالة", s.returned ? "مرتجعة" : "مكتملة"],
  ];
  let r = 7;
  for (const [a, b, c, d] of info) {
    ws.mergeCells(r, 5, r, 6);
    const cells: [number, string, boolean][] = [[1, a, true], [3, b, false], [4, c, true], [5, d, false]];
    ws.mergeCells(r, 1, r, 2);
    for (const [col, v, label] of cells) {
      const cell = ws.getCell(r, col);
      cell.value = v; cell.border = box;
      cell.font = font({ bold: label, color: { argb: label ? "FF334155" : "FF0F172A" } });
      cell.fill = fill(label ? BRAND.gray : "FFFFFF");
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
    ws.getRow(r).height = 20; r++;
  }

  r++;
  const head = ["م", "الصنف", "رقم القطعة", "الكمية", `سعر الوحدة`, `الإجمالي (${st.currency})`];
  head.forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h; c.font = font({ bold: true, color: { argb: "FFFFFFFF" } }); c.fill = fill(BRAND.green);
    c.alignment = { horizontal: "center", vertical: "middle" }; c.border = box;
  });
  ws.getRow(r).height = 24;
  const first = r + 1;
  s.items.forEach((it, idx) => {
    r++;
    const vals: (string | number | { formula: string })[] = [idx + 1, it.name, it.partNo, it.qty, it.price, { formula: `D${r}*E${r}` }];
    vals.forEach((v, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = v as never; c.border = box; c.font = font();
      if (idx % 2) c.fill = fill(BRAND.gray);
      c.alignment = { horizontal: i === 1 ? "right" : "center", vertical: "middle", wrapText: i === 1 };
      if (i >= 3) c.numFmt = numFmt;
    });
    ws.getCell(r, 6).value = { formula: `D${r}*E${r}`, result: it.qty * it.price } as never;
    ws.getRow(r).height = 20;
  });
  const last = r;

  r += 2;
  const totals: [string, number | { formula: string; result: number }, boolean][] = [
    ["الإجمالي", { formula: `SUM(F${first}:F${last})`, result: s.subtotal }, false],
    ["الخصم", s.discount, false],
    ["الصافي المستحق", { formula: `F${r}-F${r + 1}`, result: s.total }, true],
  ];
  for (const [label, v, strong] of totals) {
    ws.mergeCells(r, 4, r, 5);
    const l = ws.getCell(r, 4), c = ws.getCell(r, 6);
    l.value = label; c.value = v as never; c.numFmt = `${numFmt} "${st.currency}"`;
    for (const x of [l, c]) {
      x.border = box; x.alignment = { horizontal: x === l ? "right" : "center", vertical: "middle" };
      x.font = font({ bold: true, size: strong ? 13 : 11, color: { argb: strong ? "FFFFFFFF" : "FF0F172A" } });
      x.fill = fill(strong ? BRAND.dark : BRAND.greenLight);
    }
    ws.getRow(r).height = strong ? 26 : 20; r++;
  }

  r += 1;
  ws.mergeCells(r, 1, r, 6);
  const f = ws.getCell(r, 1);
  f.value = `${st.footer}\nشكراً لتعاملكم معنا`; f.font = font({ size: 10, italic: true, color: { argb: "FF64748B" } });
  f.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; ws.getRow(r).height = 36;

  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], `فاتورة-${s.no}.xlsx`, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function a4Html(s: Sale, st: StoreInfo) {
  const cur = st.currency;
  const rows = s.items.map((i, idx) => `
    <tr style="background:${idx % 2 ? "#f8fafc" : "#fff"}">
      <td style="padding:10px;text-align:center;color:#64748b">${num(idx + 1)}</td>
      <td style="padding:10px;font-weight:700">${esc(i.name)}</td>
      <td style="padding:10px;text-align:center;font-family:monospace;direction:ltr">${esc(i.partNo)}</td>
      <td style="padding:10px;text-align:center">${num(i.qty)}</td>
      <td style="padding:10px;text-align:center">${num(i.price)}</td>
      <td style="padding:10px;text-align:center;font-weight:700">${num(i.qty * i.price)}</td>
    </tr>`).join("");
  const infoCell = (k: string, v: string) => `<div style="flex:1;min-width:45%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc"><div style="font-size:11px;color:#64748b">${k}</div><div style="font-size:14px;font-weight:700;margin-top:2px">${esc(v)}</div></div>`;
  return `
  <div style="width:794px;min-height:1123px;box-sizing:border-box;background:#fff;color:#0f172a;font-family:Cairo,Tajawal,Arial,sans-serif;direction:rtl;display:flex;flex-direction:column">
    <div style="background:#0f172a;color:#fff;padding:28px 40px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:22px;font-weight:800">${esc(st.storeName)}</div>
        <div style="font-size:13px;opacity:.85;margin-top:4px">${esc(st.subtitle)}</div>
        <div style="font-size:12px;opacity:.7;margin-top:6px">${esc(st.address ?? "")}${st.address ? " · " : ""}هاتف: <span style="direction:ltr;unicode-bidi:embed">${esc(st.phone)}</span></div>
      </div>
      <div style="text-align:left">
        <div style="font-size:26px;font-weight:800;color:#34d399">فاتورة</div>
        <div style="font-size:14px;margin-top:4px">رقم <b>#${num(s.no)}</b></div>
      </div>
    </div>
    <div style="height:6px;background:linear-gradient(90deg,#059669,#fbbf24)"></div>
    <div style="padding:28px 40px;flex:1">
      ${s.returned ? `<div style="margin-bottom:16px;padding:8px;text-align:center;border:2px solid #dc2626;color:#dc2626;font-weight:800;border-radius:8px">فاتورة مرتجعة</div>` : ""}
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px">
        ${infoCell("العميل", s.customerName)}${infoCell("التاريخ والوقت", dateTime(s.date))}
        ${infoCell("الكاشير", s.cashier)}${infoCell("طريقة الدفع", PAY_LABEL[s.method])}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0">
        <thead><tr style="background:#059669;color:#fff">
          <th style="padding:10px;width:40px">م</th><th style="padding:10px;text-align:right">الصنف</th><th style="padding:10px">رقم القطعة</th>
          <th style="padding:10px;width:60px">الكمية</th><th style="padding:10px">سعر الوحدة</th><th style="padding:10px">الإجمالي</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:20px">
        <div style="width:300px;font-size:14px">
          <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e2e8f0"><span>الإجمالي</span><b>${money(s.subtotal, cur)}</b></div>
          <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e2e8f0"><span>الخصم</span><b style="color:#dc2626">${money(s.discount, cur)}</b></div>
          <div style="display:flex;justify-content:space-between;padding:12px;margin-top:6px;background:#0f172a;color:#fff;border-radius:8px;font-size:16px"><span>الصافي المستحق</span><b style="color:#34d399">${money(s.total, cur)}</b></div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:60px;font-size:13px;color:#475569">
        <div style="text-align:center;width:200px"><div style="border-top:1px solid #94a3b8;padding-top:6px">توقيع المستلم</div></div>
        <div style="text-align:center;width:200px"><div style="border-top:1px solid #94a3b8;padding-top:6px">الختم والتوقيع المعتمد</div></div>
      </div>
    </div>
    <div style="padding:16px 40px;border-top:3px solid #059669;background:#f8fafc;text-align:center;font-size:12px;color:#475569">
      <div>${esc(st.footer)}</div><div style="margin-top:4px;font-weight:700;color:#059669">شكراً لتعاملكم معنا</div>
    </div>
  </div>`;
}

export async function invoicePDF(s: Sale, st: StoreInfo): Promise<File> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;z-index:-1";
  host.innerHTML = a4Html(s, st);
  document.body.appendChild(host);
  try {
    await document.fonts?.ready;
    const canvas = await html2canvas(host.firstElementChild as HTMLElement, { scale: 2, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pw = 210, ph = 297;
    const h = (canvas.height * pw) / canvas.width;
    const img = canvas.toDataURL("image/jpeg", 0.95);
    for (let y = 0; y < h - 2; y += ph) { if (y) pdf.addPage(); pdf.addImage(img, "JPEG", 0, -y, pw, h); }
    return new File([pdf.output("blob")], `فاتورة-${s.no}.pdf`, { type: "application/pdf" });
  } finally { host.remove(); }
}

/** Share via system share sheet when files are supported, otherwise download. Returns true if shared. */
export async function shareOrDownload(file: File, title: string): Promise<boolean> {
  downloadBlob(file.name, file);
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  if (touch && nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title }); } catch { /* الملف تم تنزيله مسبقاً */ }
  }
  return false;
}
