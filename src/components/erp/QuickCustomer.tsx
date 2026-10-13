import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setDB, uid } from "@/lib/store";
import { Field, Modal } from "./ui";

export function QuickCustomer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const [f, setF] = useState({ name: "", phone: "", car: "" });
  const [err, setErr] = useState("");
  const save = () => {
    if (f.name.trim().length < 2) return setErr("الاسم مطلوب");
    const id = uid();
    setDB((d) => ({ ...d, customers: [...d.customers, { id, name: f.name.trim(), phone: f.phone, car: f.car || "-", debt: 0, points: 0 }] }));
    toast.success("تمت إضافة العميل"); onCreated?.(id); setF({ name: "", phone: "", car: "" }); setErr(""); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="إضافة عميل جديد">
      <div className="space-y-3">
        <Field label="اسم العميل" error={err}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="رقم الهاتف"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} dir="ltr" /></Field>
        <Field label="موديل السيارة"><Input value={f.car} onChange={(e) => setF({ ...f, car: e.target.value })} placeholder="مثال: توسان 2017" /></Field>
        <Button className="w-full" onClick={save}>حفظ العميل</Button>
      </div>
    </Modal>
  );
}
