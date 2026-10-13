import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Banknote, Plus, Trash2, Truck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { paySupplier, savePurchase, setDB, uid, useDB, type Supplier } from "@/lib/store";
import { dateTime, money, num } from "@/lib/format";
import { Badge, Field, Modal, PageHeader, selectCls, tableWrap, td, th } from "@/components/erp/ui";

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "المشتريات والموردين | مجموعة عمر عبد الله" },
      { name: "description", content: "إدارة موردي قطع الغيار الكورية وفواتير المشتريات وسداد المستحقات." },
      { property: "og:title", content: "المشتريات والموردين" },
      { property: "og:description", content: "فواتير مشتريات تزيد المخزون فوراً وسداد دفعات الموردين." },
    ],
  }),
  component: Purchases,
});

function Purchases() {
  const { suppliers, purchases, settings } = useDB();
  const [pay, setPay] = useState<Supplier | null>(null);
  const [addSup, setAddSup] = useState(false);
  const [builder, setBuilder] = useState(false);
  const cur = settings.currency;
  return (
    <div>
      <PageHeader title="المشتريات والموردين" subtitle="الموردون وفواتير الشراء" icon={Truck} actions={<>
        <Button onClick={() => setBuilder(true)}><Plus /> فاتورة مشتريات جديدة</Button>
        <Button variant="secondary" onClick={() => setAddSup(true)}><UserPlus /> مورد جديد</Button>
      </>} />
      <h2 className="mb-2 font-bold">دليل الموردين</h2>
      <div className={`${tableWrap} mb-6`}>
        <table className="w-full">
          <thead className="border-b border-border"><tr>{["المورد", "الهاتف", "الشركة", "المستحقات", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{suppliers.map((s) => (
            <tr key={s.id} className="border-b border-border/50">
              <td className={`${td} font-semibold`}>{s.name}</td>
              <td className={td} dir="ltr">{s.phone}</td>
              <td className={td}>{s.company}</td>
              <td className={td}>{s.balance > 0 ? <span className="font-bold text-accent">{money(s.balance, cur)}</span> : <Badge>لا توجد مستحقات</Badge>}</td>
              <td className={td}><Button size="sm" variant="outline" disabled={s.balance <= 0} onClick={() => setPay(s)}><Banknote /> سداد دفعة للمورد</Button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <h2 className="mb-2 font-bold">سجل فواتير المشتريات</h2>
      <div className={tableWrap}>
        <table className="w-full">
          <thead className="border-b border-border"><tr>{["رقم", "التاريخ", "المورد", "الأصناف", "الإجمالي"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{purchases.map((p) => (
            <tr key={p.id} className="border-b border-border/50">
              <td className={`${td} font-bold`}>#{num(p.no)}</td><td className={td}>{dateTime(p.date)}</td><td className={td}>{p.supplierName}</td>
              <td className={`${td} whitespace-normal`}>{p.items.map((i) => `${i.name} × ${num(i.qty)}`).join("، ")}</td>
              <td className={`${td} font-bold`}>{money(p.total, cur)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <PayModal supplier={pay} onClose={() => setPay(null)} />
      <SupplierModal open={addSup} onClose={() => setAddSup(false)} />
      <PurchaseBuilder open={builder} onClose={() => setBuilder(false)} />
    </div>
  );
}

function PayModal({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"cash" | "bankak">("cash");
  if (!supplier) return null;
  const err = amount <= 0 ? "أدخل مبلغاً صحيحاً" : amount > supplier.balance ? "المبلغ أكبر من المستحقات" : "";
  return (
    <Modal open onClose={onClose} title="سداد دفعة للمورد" description={`${supplier.name} — المستحق: ${money(supplier.balance)}`}>
      <div className="space-y-3">
        <Field label="المبلغ" error={amount ? err : ""}><Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
        <Field label="طريقة السداد"><select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value as "cash" | "bankak")}><option value="cash">كاش من الخزينة</option><option value="bankak">تحويل بنكك</option></select></Field>
        <Button className="w-full" disabled={!!err} onClick={() => { paySupplier(supplier.id, amount, method); toast.success("تم السداد وخصمه من الخزينة"); setAmount(0); onClose(); }}>تأكيد السداد</Button>
      </div>
    </Modal>
  );
}

function SupplierModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = useState({ name: "", phone: "", company: "", balance: 0 });
  return (
    <Modal open={open} onClose={onClose} title="إضافة مورد">
      <div className="space-y-3">
        <Field label="اسم المورد"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="الهاتف"><Input dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="الشركة"><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
        <Field label="رصيد افتتاحي مستحق"><Input type="number" value={f.balance || ""} onChange={(e) => setF({ ...f, balance: Number(e.target.value) })} /></Field>
        <Button className="w-full" disabled={!f.name.trim()} onClick={() => { setDB((d) => ({ ...d, suppliers: [...d.suppliers, { id: uid(), ...f }] })); toast.success("تمت إضافة المورد"); setF({ name: "", phone: "", company: "", balance: 0 }); onClose(); }}>حفظ</Button>
      </div>
    </Modal>
  );
}

function PurchaseBuilder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { suppliers, products, settings } = useDB();
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<{ key: string; productId: string; qty: number; cost: number }[]>([]);
  const [paid, setPaid] = useState(false);
  const addLine = () => { const p = products[0]; setItems((x) => [...x, { key: uid(), productId: p.id, qty: 1, cost: p.cost }]); };
  const total = items.reduce((s, i) => s + i.qty * i.cost, 0);
  const save = () => {
    try { const p = savePurchase(supplierId, items, paid); toast.success(`تم حفظ فاتورة المشتريات #${num(p.no)} وزيادة المخزون`); setItems([]); setSupplierId(""); onClose(); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Modal open={open} onClose={onClose} title="فاتورة مشتريات جديدة" className="sm:max-w-2xl">
      <div className="space-y-3">
        <Field label="المورد"><select className={selectCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">— اختر المورد —</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        {items.map((it, idx) => (
          <div key={it.key} className="grid grid-cols-[1fr_70px_100px_auto] items-end gap-2">
            <Field label={idx === 0 ? "الصنف" : ""}><select className={selectCls} value={it.productId} onChange={(e) => { const p = products.find((x) => x.id === e.target.value)!; setItems((x) => x.map((l) => (l.key === it.key ? { ...l, productId: p.id, cost: p.cost } : l))); }}>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.partNo})</option>)}</select></Field>
            <Field label={idx === 0 ? "الكمية" : ""}><Input type="number" min={1} value={it.qty} onChange={(e) => setItems((x) => x.map((l) => (l.key === it.key ? { ...l, qty: Number(e.target.value) } : l)))} /></Field>
            <Field label={idx === 0 ? "التكلفة" : ""}><Input type="number" min={0} value={it.cost} onChange={(e) => setItems((x) => x.map((l) => (l.key === it.key ? { ...l, cost: Number(e.target.value) } : l)))} /></Field>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setItems((x) => x.filter((l) => l.key !== it.key))}><Trash2 /></Button>
          </div>
        ))}
        <Button variant="outline" className="w-full" onClick={addLine}><Plus /> إضافة صنف</Button>
        <label className="flex items-center gap-2 text-sm"><Switch checked={paid} onCheckedChange={setPaid} /> مدفوعة نقداً من الخزينة (وإلا تضاف لمستحقات المورد)</label>
        <div className="flex justify-between text-lg font-extrabold"><span>الإجمالي</span><span className="text-primary">{money(total, settings.currency)}</span></div>
        <Button className="w-full" onClick={save}>حفظ الفاتورة وزيادة المخزون</Button>
      </div>
    </Modal>
  );
}
