import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Banknote, Landmark, Receipt, ShoppingBag, Vault, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addExpense, treasury, useDB, type TxType } from "@/lib/store";
import { dateTime, money } from "@/lib/format";
import { Badge, Field, Modal, PageHeader, Stat, selectCls, tableWrap, td, th } from "@/components/erp/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/treasury")({
  head: () => ({
    meta: [
      { title: "الخزينة والمالية | مجموعة عمر عبد الله" },
      { name: "description", content: "رصيد الخزينة، مبيعات الكاش وبنكك، المصروفات وسجل حركة النقدية." },
      { property: "og:title", content: "الخزينة والمالية" },
      { property: "og:description", content: "متابعة التدفقات النقدية للمحل." },
    ],
  }),
  component: Treasury,
});

const TYPES: TxType[] = ["مبيعات", "مشتريات", "مصروفات", "سداد ديون", "تحصيل ديون", "مرتجعات"];

function Treasury() {
  const db = useDB();
  const t = treasury(db);
  const cur = db.settings.currency;
  const [filter, setFilter] = useState<string>("الكل");
  const [open, setOpen] = useState(false);
  const list = db.txs.filter((x) => filter === "الكل" || x.type === filter);
  return (
    <div>
      <PageHeader title="الخزينة والمالية" icon={Vault} actions={<Button onClick={() => setOpen(true)}><Receipt /> تسجيل مصروف جديد</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <Stat label="رصيد الخزينة الحالي" value={money(t.balance, cur)} icon={Vault} />
        <Stat label="مبيعات الكاش" value={money(t.cashSales, cur)} icon={Banknote} />
        <Stat label="مبيعات بنكك" value={money(t.bankakSales, cur)} icon={Landmark} tone="muted" />
        <Stat label="المشتريات والسداد" value={money(t.purchases, cur)} icon={ShoppingBag} tone="accent" />
        <Stat label="المصروفات" value={money(t.expenses, cur)} icon={Receipt} tone="destructive" />
        <Stat label="صافي الكاش في اليد" value={money(t.cashInHand, cur)} icon={Wallet} />
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {["الكل", ...TYPES].map((x) => <button key={x} onClick={() => setFilter(x)} className={cn("whitespace-nowrap rounded-full border px-4 py-1.5 text-sm", filter === x ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{x}</button>)}
      </div>
      <div className={tableWrap}>
        <table className="w-full">
          <thead className="border-b border-border"><tr>{["التاريخ", "النوع", "البيان", "الطريقة", "وارد", "صادر"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{list.map((x) => (
            <tr key={x.id} className="border-b border-border/50">
              <td className={td}>{dateTime(x.date)}</td>
              <td className={td}><Badge tone={x.dir === "in" ? "primary" : "destructive"}>{x.type}</Badge></td>
              <td className={`${td} whitespace-normal`}>{x.note}</td>
              <td className={td}>{x.method === "cash" ? "كاش" : "بنكك"}</td>
              <td className={`${td} text-primary`}>{x.dir === "in" && <span className="flex items-center gap-1"><ArrowDownCircle className="h-4 w-4" />{money(x.amount, cur)}</span>}</td>
              <td className={`${td} text-destructive`}>{x.dir === "out" && <span className="flex items-center gap-1"><ArrowUpCircle className="h-4 w-4" />{money(x.amount, cur)}</span>}</td>
            </tr>
          ))}</tbody>
        </table>
        {list.length === 0 && <div className="py-10 text-center text-muted-foreground">لا توجد حركات</div>}
      </div>
      <ExpenseModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function ExpenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = useState({ cat: "نثريات", amount: 0, method: "cash" as "cash" | "bankak", note: "" });
  return (
    <Modal open={open} onClose={onClose} title="تسجيل مصروف جديد">
      <div className="space-y-3">
        <Field label="نوع المصروف"><select className={selectCls} value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{["نثريات", "إيجار", "فواتير", "عمالة"].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="المبلغ" error={f.amount < 0 ? "قيمة غير صحيحة" : ""}><Input type="number" value={f.amount || ""} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></Field>
        <Field label="طريقة الدفع"><select className={selectCls} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as "cash" | "bankak" })}><option value="cash">كاش</option><option value="bankak">بنكك</option></select></Field>
        <Field label="ملاحظات"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="مثال: فاتورة كهرباء أكتوبر" /></Field>
        <Button className="w-full" disabled={f.amount <= 0} onClick={() => { addExpense(f.cat, f.amount, f.method, f.note); toast.success("تم تسجيل المصروف"); setF({ ...f, amount: 0, note: "" }); onClose(); }}>حفظ المصروف</Button>
      </div>
    </Modal>
  );
}
