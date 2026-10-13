import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty, Field, Modal, PageHeader, selectCls, tableWrap, td, th } from "@/components/erp/ui";
import { MAIN_WH, transferStock, useDB, whQty } from "@/lib/store";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/transfers")({
  head: () => ({
    meta: [
      { title: "التحويل بين المخازن | مجموعة عمر عبد الله" },
      { name: "description", content: "نقل قطع الغيار بين الفروع والمخازن وسجل التحويلات." },
      { property: "og:title", content: "التحويل بين المخازن" },
      { property: "og:description", content: "أذونات تحويل مخزني بين الفروع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransfersPage,
});

function TransfersPage() {
  const db = useDB();
  const { warehouses, products, transfers } = db;
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("w2");
  const [to, setTo] = useState(MAIN_WH);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<{ productId: string; qty: number }[]>([]);
  const [pick, setPick] = useState("");

  const add = () => {
    if (!pick || items.some((i) => i.productId === pick)) return;
    setItems([...items, { productId: pick, qty: 1 }]); setPick("");
  };
  const submit = () => {
    try {
      const t = transferStock(from, to, items, note);
      toast.success(`تم التحويل رقم ${t.no}`); setOpen(false); setItems([]); setNote("");
    } catch (e) { toast.error((e as Error).message); }
  };
  const avail = products.filter((p) => whQty(db, p.id, from) > 0);

  return (
    <div>
      <PageHeader title="التحويل بين المخازن" subtitle={`${transfers.length} تحويل`} icon={ArrowLeftRight} actions={<Button onClick={() => setOpen(true)}><Plus /> تحويل جديد</Button>} />
      <div className={tableWrap}>
        {transfers.length === 0 ? <Empty text="لا توجد تحويلات بعد" /> : (
          <table className="w-full">
            <thead><tr className="border-b border-border"><th className={th}>رقم</th><th className={th}>التاريخ</th><th className={th}>من</th><th className={th}>إلى</th><th className={th}>الأصناف</th><th className={th}>المنفذ</th><th className={th}>ملاحظة</th></tr></thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-b border-border/50 align-top">
                  <td className={td + " font-bold"}>#{t.no}</td>
                  <td className={td}>{new Date(t.date).toLocaleString("ar-EG")}</td>
                  <td className={td}>{t.fromName}</td>
                  <td className={td}>{t.toName}</td>
                  <td className={td}>{t.items.map((i) => <div key={i.productId}>{i.name} × {fmtNum(i.qty)}</div>)}</td>
                  <td className={td}>{t.by}</td>
                  <td className={td}>{t.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="إذن تحويل مخزني" className="sm:max-w-2xl">
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <Field label="من مخزن"><select className={selectCls} value={from} onChange={(e) => { setFrom(e.target.value); setItems([]); }}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
            <ArrowLeft className="mb-2 h-5 w-5 shrink-0 text-primary" />
            <Field label="إلى مخزن"><select className={selectCls} value={to} onChange={(e) => setTo(e.target.value)}>{warehouses.filter((w) => w.id !== from).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
          </div>
          <div className="flex gap-2">
            <select className={selectCls} value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">اختر صنفاً متوفراً…</option>
              {avail.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.partNo}) - متوفر {whQty(db, p.id, from)}</option>)}
            </select>
            <Button variant="secondary" onClick={add}><Plus /></Button>
          </div>
          {items.map((i) => {
            const p = products.find((x) => x.id === i.productId)!;
            const max = whQty(db, i.productId, from);
            return (
              <div key={i.productId} className="flex items-center gap-2 rounded-xl bg-muted/40 p-2 text-sm">
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">متوفر: {fmtNum(max)}</div></div>
                <Input type="number" min={1} max={max} className="w-24" value={i.qty} onChange={(e) => setItems(items.map((x) => (x.productId === i.productId ? { ...x, qty: Number(e.target.value) } : x)))} />
                <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((x) => x.productId !== i.productId))}><Trash2 className="text-destructive" /></Button>
              </div>
            );
          })}
          <Field label="ملاحظة"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Button className="w-full" onClick={submit} disabled={!items.length || from === to}>تنفيذ التحويل</Button>
        </div>
      </Modal>
    </div>
  );
}
