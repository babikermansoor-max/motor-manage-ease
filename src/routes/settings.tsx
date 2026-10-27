import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Database, Download, RotateCcw, Save, Settings as SettingsIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDB, replaceDB, resetDB, setDB, useDB, type DB, type Settings } from "@/lib/store";
import { downloadBlob } from "@/lib/format";
import { Field, Modal, PageHeader } from "@/components/erp/ui";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات والنسخ الاحتياطي | مجموعة عمر عبد الله" },
      { name: "description", content: "إعدادات بيانات المحل والفاتورة والنسخ الاحتياطي لقاعدة البيانات." },
      { property: "og:title", content: "الإعدادات والنسخ الاحتياطي" },
      { property: "og:description", content: "تخصيص المحل وحفظ واستعادة البيانات." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings } = useDB();
  const [f, setF] = useState<Settings>(settings);
  const [confirmReset, setConfirmReset] = useState(false);
  const up = (k: keyof Settings) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const backup = () => downloadBlob(`omar-parts-backup-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(getDB(), null, 2)], { type: "application/json" }));
  const restore = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as DB;
      if (!Array.isArray(data.products) || !data.settings) throw new Error();
      replaceDB(data); setF(data.settings); toast.success("تمت استعادة قاعدة البيانات");
    } catch { toast.error("ملف النسخة الاحتياطية غير صالح"); }
  };
  return (
    <div className="max-w-3xl">
      <PageHeader title="الإعدادات والنسخ الاحتياطي" icon={SettingsIcon} />
      <div className="glass mb-4 space-y-3 rounded-2xl p-4">
        <h2 className="font-bold">بيانات المحل</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="اسم المحل"><Input value={f.storeName} onChange={up("storeName")} /></Field>
          <Field label="الوصف الفرعي"><Input value={f.subtitle} onChange={up("subtitle")} /></Field>
          <Field label="الهاتف"><Input dir="ltr" value={f.phone} onChange={up("phone")} /></Field>
          <Field label="العنوان"><Input value={f.address} onChange={up("address")} /></Field>
          <Field label="رمز العملة"><Input value={f.currency} onChange={up("currency")} /></Field>
          <Field label="اسم الكاشير"><Input value={f.cashier} onChange={up("cashier")} /></Field>
          <Field label="بداية الوردية"><Input type="time" value={f.shiftStart} onChange={up("shiftStart")} /></Field>
        </div>
        <Field label="ملاحظات أسفل الفاتورة (سياسة الإرجاع)"><Textarea value={f.footer} onChange={up("footer")} /></Field>
        <Button onClick={() => { setDB((d) => ({ ...d, settings: f })); toast.success("تم حفظ الإعدادات"); }}><Save /> حفظ الإعدادات</Button>
      </div>
      <div className="glass space-y-3 rounded-2xl p-4">
        <h2 className="flex items-center gap-2 font-bold"><Database className="h-4 w-4 text-primary" /> النسخ الاحتياطي</h2>
        <p className="text-sm text-muted-foreground">البيانات محفوظة على هذا الجهاز. صدّر نسخة احتياطية بانتظام.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={backup}><Download /> تصدير قاعدة البيانات (JSON)</Button>
          <Button variant="secondary" asChild><label className="cursor-pointer"><Upload /> استيراد قاعدة البيانات<input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} /></label></Button>
          <Button variant="destructive" onClick={() => setConfirmReset(true)}><RotateCcw /> إعادة البيانات التجريبية</Button>
        </div>
      </div>
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="إعادة ضبط البيانات" description="سيتم حذف كل البيانات الحالية واستبدالها بالبيانات التجريبية.">
        <div className="flex gap-2">
          <Button variant="destructive" className="flex-1" onClick={() => { resetDB(); setF(getDB().settings); setConfirmReset(false); toast.success("تمت إعادة الضبط"); }}>تأكيد</Button>
          <Button variant="outline" className="flex-1" onClick={() => setConfirmReset(false)}>إلغاء</Button>
        </div>
      </Modal>
    </div>
  );
}
