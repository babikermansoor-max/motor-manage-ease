import { Copy, FileSpreadsheet, FileText, Loader2, MessageCircle, Printer, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { invoiceExcel, invoicePDF, shareOrDownload } from "@/lib/invoice-export";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "./ui";
import { PAY_LABEL, useDB, type Sale } from "@/lib/store";
import { dateTime, money, num } from "@/lib/format";

export function receiptText(s: Sale, store: { storeName: string; subtitle: string; phone: string; currency: string; footer: string }) {
  const lines = [
    `*${store.storeName}*`, store.subtitle, `هاتف: ${store.phone}`, "------------------",
    `فاتورة رقم: ${s.no}`, `التاريخ: ${dateTime(s.date)}`, `العميل: ${s.customerName}`, `الكاشير: ${s.cashier}`, "------------------",
    ...s.items.map((i) => `${i.name} (${i.partNo})\n  ${num(i.qty)} × ${money(i.price, store.currency)} = ${money(i.qty * i.price, store.currency)}`),
    "------------------", `الإجمالي: ${money(s.subtotal, store.currency)}`, `الخصم: ${money(s.discount, store.currency)}`, `*الصافي: ${money(s.total, store.currency)}*`,
    `طريقة الدفع: ${PAY_LABEL[s.method]}`, "------------------", store.footer,
  ];
  return lines.join("\n");
}

export function ReceiptView({ sale }: { sale: Sale }) {
  const { settings: st } = useDB();
  return (
    <div className="print-area receipt mx-auto w-full max-w-[80mm] rounded-md bg-receipt p-4 font-mono text-[12px] leading-relaxed text-receipt-foreground" dir="rtl">
      <div className="text-center">
        <div className="text-[14px] font-extrabold">{st.storeName}</div>
        <div>{st.subtitle}</div>
        <div>{st.address}</div>
        <div>هاتف: {st.phone}</div>
      </div>
      <div className="my-2 border-t border-dashed border-current" />
      <div className="flex justify-between"><span>فاتورة رقم</span><b>#{sale.no}</b></div>
      <div className="flex justify-between"><span>التاريخ</span><span>{dateTime(sale.date)}</span></div>
      <div className="flex justify-between"><span>العميل</span><span>{sale.customerName}</span></div>
      <div className="flex justify-between"><span>الكاشير</span><span>{sale.cashier}</span></div>
      {sale.returned && <div className="mt-1 text-center font-bold">*** فاتورة مرتجعة ***</div>}
      <div className="my-2 border-t border-dashed border-current" />
      <table className="w-full">
        <thead><tr className="border-b border-current"><th className="text-right">الصنف</th><th>كمية</th><th className="text-left">المبلغ</th></tr></thead>
        <tbody>
          {sale.items.map((i) => (
            <tr key={i.productId} className="align-top">
              <td className="py-1 text-right">{i.name}<div className="text-[10px] opacity-70">{i.partNo} · {num(i.price)}</div></td>
              <td className="text-center">{num(i.qty)}</td>
              <td className="text-left">{num(i.price * i.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="my-2 border-t border-dashed border-current" />
      <div className="flex justify-between"><span>الإجمالي</span><span>{money(sale.subtotal, st.currency)}</span></div>
      <div className="flex justify-between"><span>الخصم</span><span>{money(sale.discount, st.currency)}</span></div>
      <div className="flex justify-between text-[14px] font-extrabold"><span>الصافي</span><span>{money(sale.total, st.currency)}</span></div>
      <div className="flex justify-between"><span>طريقة الدفع</span><span>{PAY_LABEL[sale.method]}</span></div>
      <div className="my-2 border-t border-dashed border-current" />
      <p className="text-center text-[11px]">{st.footer}</p>
      <p className="mt-1 text-center text-[11px]">شكراً لتعاملكم معنا</p>
    </div>
  );
}

export function ReceiptModal({ sale, onClose, onNew }: { sale: Sale | null; onClose: () => void; onNew?: () => void }) {
  const { settings } = useDB();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"" | "pdf" | "xlsx">("");
  if (!sale) return null;
  const text = receiptText(sale, settings);
  const run = async (kind: "pdf" | "xlsx") => {
    setBusy(kind);
    try {
      const file = kind === "pdf" ? await invoicePDF(ref.current!.firstElementChild as HTMLElement, sale) : await invoiceExcel(sale, settings);
      const shared = await shareOrDownload(file, `فاتورة #${sale.no}`);
      if (!shared) toast.success(kind === "pdf" ? "تم تنزيل ملف PDF" : "تم تنزيل ملف Excel");
    } catch {
      toast.error("تعذّر إنشاء الملف، حاول مرة أخرى");
    } finally { setBusy(""); }
  };
  return (
    <Modal open={!!sale} onClose={onClose} title={`فاتورة #${num(sale.no)}`} className="sm:max-w-md">
      <div ref={ref}><ReceiptView sale={sale} /></div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => window.print()}><Printer /> طباعة الفاتورة</Button>
        <Button variant="secondary" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")}><MessageCircle /> مشاركة واتساب</Button>
        <Button variant="secondary" disabled={!!busy} onClick={() => run("pdf")}>{busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />} مشاركة PDF</Button>
        <Button variant="secondary" disabled={!!busy} onClick={() => run("xlsx")}>{busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} مشاركة Excel</Button>
        <Button variant="outline" onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("تم نسخ نص الفاتورة"))}><Copy /> نسخ نص الفاتورة</Button>
        <Button variant="outline" onClick={() => { onNew?.(); onClose(); }}><RotateCcw /> {onNew ? "بدء بيع جديد" : "إغلاق"}</Button>
      </div>
    </Modal>
  );
}
