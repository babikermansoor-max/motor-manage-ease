import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, LogIn, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/erp/ui";
import { NAV } from "@/components/erp/AppShell";
import { can, login, permForPath, useDB } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | مجموعة عمر عبد الله لقطع الغيار" },
      { name: "description", content: "تسجيل دخول الموظفين إلى نظام إدارة المحل ونقطة البيع." },
      { property: "og:title", content: "تسجيل الدخول - نظام قطع الغيار" },
      { property: "og:description", content: "دخول الموظفين حسب الصلاحيات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { settings } = useDB();
  const navigate = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const emp = login(u, p);
      toast.success(`مرحباً ${emp.name}`);
      const first = NAV.find((n) => can(emp, permForPath(n.to)!));
      navigate({ to: first?.to ?? "/", replace: true });
    } catch (err) { toast.error((err as Error).message); }
  };
  return (
    <div dir="rtl" className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="glass w-full max-w-sm space-y-4 rounded-3xl p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><Wrench className="h-7 w-7" /></div>
          <h1 className="text-lg font-extrabold">{settings.storeName}</h1>
          <p className="text-sm text-muted-foreground">{settings.subtitle}</p>
        </div>
        <Field label="اسم المستخدم"><Input dir="ltr" autoFocus value={u} onChange={(e) => setU(e.target.value)} placeholder="admin" /></Field>
        <Field label="الرمز السري"><Input dir="ltr" type="password" inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} placeholder="••••" /></Field>
        <Button type="submit" className="w-full"><LogIn /> دخول</Button>
        <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1 font-bold text-foreground"><KeyRound className="h-3.5 w-3.5" /> حسابات تجريبية</div>
          المدير: admin / 1234 · الكاشير: cashier / 1111 · المخزن: store / 2222
        </div>
      </form>
    </div>
  );
}
