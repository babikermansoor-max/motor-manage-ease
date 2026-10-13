import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Field, Modal, PageHeader, selectCls, tableWrap, td, th } from "@/components/erp/ui";
import { ALL_PERMS, PERMS, setDB, uid, useCurrentUser, useDB, type Employee, type Perm } from "@/lib/store";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "الموظفين والصلاحيات | مجموعة عمر عبد الله" },
      { name: "description", content: "إدارة حسابات الموظفين وتحديد صلاحيات كل موظف." },
      { property: "og:title", content: "الموظفين والصلاحيات" },
      { property: "og:description", content: "إضافة الموظفين وتحديد الصلاحيات والفروع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffPage,
});

const ROLES: Record<string, Perm[]> = {
  "مدير عام": [...ALL_PERMS],
  "كاشير": ["pos", "sales", "customers"],
  "أمين مخزن": ["inventory", "purchases", "branches", "transfers"],
  "محاسب": ["sales", "treasury", "reports", "customers", "purchases"],
};

function StaffPage() {
  const { employees, warehouses } = useDB();
  const me = useCurrentUser();
  const [edit, setEdit] = useState<Employee | null>(null);
  const blank = (): Employee => ({ id: "", name: "", username: "", pin: "", role: "كاشير", branchId: warehouses[0]?.id ?? "main", perms: ROLES["كاشير"], active: true });

  const save = () => {
    if (!edit) return;
    if (!edit.name.trim() || !edit.username.trim() || edit.pin.length < 4) return toast.error("أدخل الاسم واسم المستخدم ورمزاً من 4 خانات على الأقل");
    if (employees.some((e) => e.id !== edit.id && e.username.toLowerCase() === edit.username.trim().toLowerCase())) return toast.error("اسم المستخدم مستخدم مسبقاً");
    if (edit.id === me?.id && (!edit.perms.includes("staff") || !edit.active)) return toast.error("لا يمكنك إزالة صلاحية الموظفين أو إيقاف حسابك");
    const e = { ...edit, username: edit.username.trim(), id: edit.id || uid() };
    setDB((d) => ({ ...d, employees: edit.id ? d.employees.map((x) => (x.id === e.id ? e : x)) : [...d.employees, e] }));
    toast.success("تم حفظ الموظف"); setEdit(null);
  };
  const del = (e: Employee) => {
    if (e.id === me?.id) return toast.error("لا يمكنك حذف حسابك");
    setDB((d) => ({ ...d, employees: d.employees.filter((x) => x.id !== e.id) })); toast.success("تم الحذف");
  };
  const toggle = (p: Perm) => edit && setEdit({ ...edit, perms: edit.perms.includes(p) ? edit.perms.filter((x) => x !== p) : [...edit.perms, p] });
  const wName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? "-";

  return (
    <div>
      <PageHeader title="الموظفين والصلاحيات" subtitle={`${employees.length} موظف`} icon={UserCog} actions={<Button onClick={() => setEdit(blank())}><Plus /> موظف جديد</Button>} />
      <div className={tableWrap}>
        <table className="w-full">
          <thead><tr className="border-b border-border"><th className={th}>الاسم</th><th className={th}>المستخدم</th><th className={th}>الدور</th><th className={th}>الفرع</th><th className={th}>الصلاحيات</th><th className={th}>الحالة</th><th className={th}></th></tr></thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-b border-border/50">
                <td className={td + " font-semibold"}>{e.name}</td>
                <td className={td} dir="ltr">{e.username}</td>
                <td className={td}><Badge tone="accent">{e.role}</Badge></td>
                <td className={td}>{wName(e.branchId)}</td>
                <td className={td}>{e.perms.length === ALL_PERMS.length ? "كل الصلاحيات" : `${e.perms.length} صلاحيات`}</td>
                <td className={td}>{e.active ? <Badge>نشط</Badge> : <Badge tone="destructive">موقوف</Badge>}</td>
                <td className={td}><div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEdit(e)}><Pencil /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(e)}><Trash2 className="text-destructive" /></Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "تعديل موظف" : "موظف جديد"}>
        {edit && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="الاسم"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="اسم المستخدم"><Input dir="ltr" value={edit.username} onChange={(e) => setEdit({ ...edit, username: e.target.value })} /></Field>
              <Field label="الرمز السري"><Input dir="ltr" value={edit.pin} onChange={(e) => setEdit({ ...edit, pin: e.target.value })} /></Field>
              <Field label="الدور">
                <select className={selectCls} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value, perms: ROLES[e.target.value] ?? edit.perms })}>
                  {Object.keys(ROLES).map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="الفرع / المخزن">
                <select className={selectCls} value={edit.branchId} onChange={(e) => setEdit({ ...edit, branchId: e.target.value })}>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </Field>
              <label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> الحساب نشط</label>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">الصلاحيات</div>
              <div className="grid grid-cols-2 gap-2">
                {PERMS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <input type="checkbox" checked={edit.perms.includes(p.key)} onChange={() => toggle(p.key)} /> {p.label}
                  </label>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={save}>حفظ</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
