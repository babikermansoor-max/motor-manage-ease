import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Eye, ReceiptText, Search, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAY_LABEL, returnSale, useDB, type Sale } from "@/lib/store";
import { dateTime, downloadCSV, money, num } from "@/lib/format";
import { Badge, Modal, PageHeader, selectCls, tableWrap, td, th } from "@/components/erp/ui";
import { ReceiptModal } from "@/components/erp/Receipt";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "المبيعات وسجل الفواتير | مجموعة عمر عبد الله" },
      { name: "description", content: "سجل جميع فواتير مبيعات قطع الغيار مع إمكانية المعاينة والطباعة ومرتجع المبيعات." },
      { property: "og:title", content: "المبيعات وسجل الفواتير" },
      { property: "og:description", content: "استعراض الفواتير وإدارة المرتجعات." },
    ],
  }),
  component: Sales,
});

function Sales() {
  const { sales, settings } = useDB();
  const [q, setQ] = useState("");
  const [m, setM] = useState("all");
  const [view, setView] = useState<Sale | null>(null);
  const [ret, setRet] = useState<Sale | null>(null);
  const list = useMemo(() => sales.filter((s) => (m === "all" || s.method === m) && (!q || String(s.no).includes(q) || s.customerName.includes(q))), [sales, q, m]);
  const exp = () => downloadCSV("sales.csv", ["رقم الفاتورة", "التاريخ", "العميل", "طريقة الدفع", "الإجمالي", "الخصم", "الصافي", "الكاشير", "الحالة"],
    list.map((s) => [s.no, dateTime(s.date), s.customerName, PAY_LABEL[s.method], s.subtotal, s.discount, s.total, s.cashier, s.returned ? "مرتجع" : "مكتملة"]));
  return (
    <div>
      <PageHeader title="المبيعات وسجل الفواتير" subtitle={`${num(sales.length)} فاتورة`} icon={ReceiptText} actions={<Button variant="outline" onClick={exp}><Download /> تصدير Excel (.csv)</Button>} />
      <div className="glass mb-4 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث برقم الفاتورة أو اسم العميل" /></div>
        <select className={`${selectCls} sm:w-44`} value={m} onChange={(e) => setM(e.target.value)} aria-label="طريقة الدفع">
          <option value="all">كل طرق الدفع</option>{Object.entries(PAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className={tableWrap}>
        <table className="w-full">
          <thead className="border-b border-border"><tr>{["رقم الفاتورة", "التاريخ والوقت", "العميل", "طريقة الدفع", "الإجمالي", "الكاشير", "الحالة", "إجراءات"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className={`${td} font-bold`}>#{num(s.no)}</td>
                <td className={td}>{dateTime(s.date)}</td>
                <td className={td}>{s.customerName}</td>
                <td className={td}><Badge tone={s.method === "credit" ? "accent" : s.method === "bankak" ? "muted" : "primary"}>{PAY_LABEL[s.method]}</Badge></td>
                <td className={`${td} font-bold text-primary`}>{money(s.total, settings.currency)}</td>
                <td className={td}>{s.cashier}</td>
                <td className={td}>{s.returned ? <Badge tone="destructive">مرتجع</Badge> : <Badge>مكتملة</Badge>}</td>
                <td className={td}>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setView(s)}><Eye /> عرض</Button>
                    {!s.returned && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRet(s)}><Undo2 /> مرتجع</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="py-10 text-center text-muted-foreground">لا توجد فواتير</div>}
      </div>
      <ReceiptModal sale={view} onClose={() => setView(null)} />
      <Modal open={!!ret} onClose={() => setRet(null)} title={`مرتجع مبيعات للفاتورة #${num(ret?.no ?? 0)}`}
        description={ret ? `ستتم إعادة ${num(ret.items.reduce((a, i) => a + i.qty, 0))} قطعة للمخزون و${ret.method === "credit" ? "خصم المبلغ من دين العميل" : "خصم " + money(ret.total, settings.currency) + " من الخزينة"}.` : ""}>
        <div className="flex gap-2">
          <Button variant="destructive" className="flex-1" onClick={() => { returnSale(ret!.id); toast.success("تم تسجيل المرتجع"); setRet(null); }}>تأكيد المرتجع</Button>
          <Button variant="outline" className="flex-1" onClick={() => setRet(null)}>إلغاء</Button>
        </div>
      </Modal>
    </div>
  );
}
