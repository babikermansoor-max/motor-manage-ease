import { PAY_LABEL, type Sale } from "@/lib/store";
import { dateTime } from "@/lib/format";
import { downloadBlob } from "@/lib/format";

type StoreInfo = { storeName: string; subtitle: string; phone: string; address?: string; currency: string; footer: string };

export async function invoiceExcel(s: Sale, st: StoreInfo): Promise<File> {
  const XLSX = await import("xlsx");
  const rows: (string | number)[][] = [
    [st.storeName], [st.subtitle], [`هاتف: ${st.phone}`], [],
    ["رقم الفاتورة", s.no], ["التاريخ", dateTime(s.date)], ["العميل", s.customerName], ["الكاشير", s.cashier], ["طريقة الدفع", PAY_LABEL[s.method]], [],
    ["الصنف", "رقم القطعة", "الكمية", `سعر الوحدة (${st.currency})`, `الإجمالي (${st.currency})`],
    ...s.items.map((i) => [i.name, i.partNo, i.qty, i.price, i.qty * i.price]),
    [], ["الإجمالي", "", "", "", s.subtotal], ["الخصم", "", "", "", s.discount], ["الصافي", "", "", "", s.total],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, "فاتورة");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buf], `فاتورة-${s.no}.xlsx`, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function invoicePDF(el: HTMLElement, s: Sale): Promise<File> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
  const w = 80;
  const h = (canvas.height * w) / canvas.width;
  const pdf = new jsPDF({ unit: "mm", format: [w, h] });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
  return new File([pdf.output("blob")], `فاتورة-${s.no}.pdf`, { type: "application/pdf" });
}

/** Share via system share sheet when files are supported, otherwise download. Returns true if shared. */
export async function shareOrDownload(file: File, title: string): Promise<boolean> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title }); return true; } catch (e) { if ((e as Error).name === "AbortError") return true; }
  }
  downloadBlob(file.name, file);
  return false;
}
