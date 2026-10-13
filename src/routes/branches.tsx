import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2, Warehouse as WIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Field, Modal, PageHeader, selectCls, tableWrap, td, th } from "@/components/erp/ui";
import { MAIN_WH, setDB, uid, useDB, whQty, type Warehouse } from "@/lib/store";
import { num } from "@/lib/format";

export const Route = createFileRoute("/branches")({
  head: () => ({
    meta: [
      { title: "الفروع والمخازن | مجموعة عمر عبد الله" },
      { name: "description", content: "إدارة الفروع والمستودعات وأرصدة القطع في كل مخزن." },
      { property: "og:title", content: "الفروع والمخازن" },
      { property: "og:description", content: "قائمة الفروع والمخازن وأرصدتها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BranchesPage,
});

function BranchesPage() {
  const db = useDB();
  const { warehouses, products } = db;
  const [edit, setEdit] = useState<Warehouse | null>(null);
  const [view, setView] = useState(MAIN_WH);

  const save = () => {
    if (!edit?.name.trim()) return toast.error("أدخل اسم الفرع أو المخزن");
    const w = { ...edit, id: edit.id || uid() };
    setDB((d) => ({ ...d, warehouses: edit.id ? d.warehouses.map((x) => (x.id === w.id ? w : x)) : [...d.warehouses, w] }));
    toast.success("تم الحفظ"); setEdit(null);
  };
  const del = (w: Warehouse) => {
    if (w.id === MAIN_WH) return toast.error("لا يمكن حذف الفرع الرئيسي");
    if (products.some((p) => whQty(db, p.id, w.id) > 0)) return toast.error("حوّل البضاعة من هذا المخزن أولاً");
    setDB((d) => ({ ...d, warehouses: d.warehouses.filter((x) => x.id !== w.id) })); toast.success("تم الحذف");
  };

  return (
    <div>
      <PageHeader title="الفروع والمخازن" subtitle={`${warehouses.length} موقع`} icon={WIcon}
        actions={<Button onClick={() => setEdit({ id: "", name: "", type: "مخزن", location: "", manager: "" })}><Plus /> إضافة</Button>} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((w) => {
          const units = products.reduce((s, p) => s + whQty(db, p.id, w.id), 0);
          const value = products.reduce((s, p) => s + whQty(db, p.id, w.id) * p.cost, 0);
          return (
            <div key={w.id} className={`glass cursor-pointer rounded-2xl p-4 ${view === w.id ? "ring-2 ring-primary" : ""}`} onClick={() => setView(w.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><div className="truncate font-bold">{w.name}</div><div className="text-xs text-muted-foreground">{w.location || "-"}</div></div>
                <Badge tone={w.type === "فرع" ? "primary" : "accent"}>{w.type}</Badge>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">المسؤول: <b className="text-foreground">{w.manager || "-"}</b></div>
              <div className="mt-1 text-sm">{num(units)} قطعة · قيمة {num(value)}</div>
              <div className="mt-3 flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => setEdit(w)}><Pencil /> تعديل</Button>
                {w.id !== MAIN_WH && <Button size="sm" variant="ghost" onClick={() => del(w)}><Trash2 className="text-destructive" /></Button>}
              </div>
            </div>
          );
        })}
      </div>
      <h2 className="mb-2 font-bold">أرصدة: {warehouses.find((w) => w.id === view)?.name}</h2>
      <div className={tableWrap}>
        <table className="w-full">
          <thead><tr className="border-b border-border"><th className={th}>الصنف</th><th className={th}>رقم القطعة</th>{warehouses.map((w) => <th key={w.id} className={th}>{w.name}</th>)}<th className={th}>الإجمالي</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className={td + " font-semibold"}>{p.name}</td>
                <td className={td} dir="ltr">{p.partNo}</td>
                {warehouses.map((w) => <td key={w.id} className={`${td} ${w.id === view ? "font-bold text-primary" : ""}`}>{num(whQty(db, p.id, w.id))}</td>)}
                <td className={td + " font-bold"}>{num(warehouses.reduce((s, w) => s + whQty(db, p.id, w.id), 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">نقطة البيع تبيع من مخزون الفرع الرئيسي. استخدم التحويل المخزني لنقل البضاعة إليه.</p>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "تعديل" : "فرع / مخزن جديد"}>
        {edit && (
          <div className="space-y-3">
            <Field label="الاسم"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="النوع"><select className={selectCls} value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as Warehouse["type"] })}><option>فرع</option><option>مخزن</option></select></Field>
            <Field label="الموقع"><Input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></Field>
            <Field label="المسؤول"><Input value={edit.manager} onChange={(e) => setEdit({ ...edit, manager: e.target.value })} /></Field>
            <Button className="w-full" onClick={save}>حفظ</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
