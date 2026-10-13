import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HandCoins, Search, Star, UserPlus, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GENERAL_CUSTOMER, collectDebt, useDB, type Customer } from "@/lib/store";
import { money, num } from "@/lib/format";
import { Badge, Field, Modal, PageHeader, Stat, selectCls, tableWrap, td, th } from "@/components/erp/ui";
import { QuickCustomer } from "@/components/erp/QuickCustomer";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "العملاء وحسابات الآجل | مجموعة عمر عبد الله" },
      { name: "description", content: "دليل العملاء وديون البيع الآجل ونقاط الولاء وتحصيل الديون." },
      { property: "og:title", content: "العملاء وحسابات الآجل" },
      { property: "og:description", content: "متابعة ديون العملاء وتحصيلها." },
    ],
  }),
  component: Customers,
});

function Customers() {
  const { customers, settings } = useDB();
  const [q, setQ] = useState("");
  const [add, setAdd] = useState(false);
  const [col, setCol] = useState<Customer | null>(null);
  const list = customers.filter((c) => c.id !== GENERAL_CUSTOMER && (!q || c.name.includes(q) || c.phone.includes(q) || c.car.includes(q)));
  const cur = settings.currency;
  return (
    <div>
      <PageHeader title="العملاء وحسابات الآجل" icon={Users} actions={<Button onClick={() => setAdd(true)}><UserPlus /> عميل جديد</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="عدد العملاء" value={num(list.length)} icon={Users} />
        <Stat label="إجمالي الديون" value={money(customers.reduce((s, c) => s + c.debt, 0), cur)} icon={Wallet} tone="accent" />
        <Stat label="نقاط الولاء" value={num(customers.reduce((s, c) => s + c.points, 0))} icon={Star} tone="muted" />
      </div>
      <div className="relative mb-4"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الهاتف أو السيارة" /></div>
      <div className={tableWrap}>
        <table className="w-full">
          <thead className="border-b border-border"><tr>{["العميل", "الهاتف", "السيارة", "ديون العميل", "نقاط الولاء", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{list.map((c) => (
            <tr key={c.id} className="border-b border-border/50">
              <td className={`${td} font-semibold`}>{c.name}</td><td className={td} dir="ltr">{c.phone}</td><td className={td}>{c.car}</td>
              <td className={td}>{c.debt > 0 ? <span className="font-bold text-accent">{money(c.debt, cur)}</span> : <Badge>خالص</Badge>}</td>
              <td className={td}><Badge tone="accent">★ {num(c.points)}</Badge></td>
              <td className={td}><Button size="sm" variant="outline" disabled={c.debt <= 0} onClick={() => setCol(c)}><HandCoins /> تحصيل دين</Button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <QuickCustomer open={add} onClose={() => setAdd(false)} />
      <CollectModal c={col} onClose={() => setCol(null)} />
    </div>
  );
}

function CollectModal({ c, onClose }: { c: Customer | null; onClose: () => void }) {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"cash" | "bankak">("cash");
  if (!c) return null;
  const err = amount <= 0 ? "أدخل مبلغاً صحيحاً" : amount > c.debt ? "المبلغ أكبر من الدين" : "";
  return (
    <Modal open onClose={onClose} title="تحصيل دين" description={`${c.name} — الدين الحالي: ${money(c.debt)}`}>
      <div className="space-y-3">
        <Field label="المبلغ المحصل" error={amount ? err : ""}><Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
        <Button variant="link" className="px-0" onClick={() => setAmount(c.debt)}>تحصيل كامل المبلغ</Button>
        <Field label="طريقة الاستلام"><select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value as "cash" | "bankak")}><option value="cash">كاش</option><option value="bankak">بنكك</option></select></Field>
        <Button className="w-full" disabled={!!err} onClick={() => { collectDebt(c.id, amount, method); toast.success("تم التحصيل وإيداعه في الخزينة"); setAmount(0); onClose(); }}>تأكيد التحصيل</Button>
      </div>
    </Modal>
  );
}
