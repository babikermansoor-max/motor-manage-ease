import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { BarChart3, FileSpreadsheet, FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAY_LABEL, useDB, type PayMethod } from "@/lib/store";
import { dateOnly, money, num } from "@/lib/format";
import { excelReport, pdfReport, shareFile, type DocMeta, type Section } from "@/lib/doc-export";
import { Modal, PageHeader, tableWrap, td, th } from "@/components/erp/ui";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "التقارير والتحليلات | مجموعة عمر عبد الله" },
      { name: "description", content: "تقارير المبيعات اليومية، طرق الدفع، الأصناف الأكثر مبيعاً وصافي الربح." },
      { property: "og:title", content: "التقارير والتحليلات" },
      { property: "og:description", content: "تحليلات مبيعات وأرباح محل قطع الغيار." },
    ],
  }),
  component: Reports,
});

const iso = (d: Date) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-2)"];

function Reports() {
  const db = useDB();
  const cur = db.settings.currency;
  const today = new Date();
  const [from, setFrom] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(iso(today));
  const [preview, setPreview] = useState(false);
  const preset = (k: "day" | "week" | "month") => {
    const d = new Date();
    if (k === "day") setFrom(iso(d));
    if (k === "week") setFrom(iso(new Date(d.getTime() - 6 * 864e5)));
    if (k === "month") setFrom(iso(new Date(d.getFullYear(), d.getMonth(), 1)));
    setTo(iso(d));
  };

  const r = useMemo(() => {
    const inRange = (dt: string) => { const s = iso(new Date(dt)); return s >= from && s <= to; };
    const sales = db.sales.filter((s) => !s.returned && inRange(s.date));
    const gross = sales.reduce((a, s) => a + s.total, 0);
    const cost = sales.reduce((a, s) => a + s.items.reduce((b, i) => b + i.cost * i.qty, 0), 0);
    const expenses = db.txs.filter((t) => t.type === "مصروفات" && inRange(t.date)).reduce((a, t) => a + t.amount, 0);
    const days = new Map<string, number>();
    for (let d = new Date(from); iso(d) <= to; d = new Date(d.getTime() + 864e5)) days.set(iso(d), 0);
    sales.forEach((s) => { const k = iso(new Date(s.date)); days.set(k, (days.get(k) ?? 0) + s.total); });
    const daily = [...days].map(([k, v]) => ({ day: dateOnly(k), total: v }));
    const byMethod = (Object.keys(PAY_LABEL) as PayMethod[]).map((m) => ({ name: PAY_LABEL[m], value: sales.filter((s) => s.method === m).reduce((a, s) => a + s.total, 0) }));
    const parts = new Map<string, { name: string; qty: number; total: number }>();
    sales.forEach((s) => s.items.forEach((i) => { const p = parts.get(i.productId) ?? { name: i.name, qty: 0, total: 0 }; p.qty += i.qty; p.total += i.qty * i.price; parts.set(i.productId, p); }));
    const top = [...parts.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
    return { count: sales.length, gross, cost, profit: gross - cost, expenses, net: gross - cost - expenses, daily, byMethod, top };
  }, [db, from, to]);

  const summary: [string, number][] = [["إجمالي المبيعات", r.gross], ["تكلفة البضاعة المباعة", r.cost], ["صافي الربح (المبيعات - التكلفة)", r.profit], ["المصروفات التشغيلية", r.expenses], ["صافي الربح النقدي", r.net]];
  const [busy, setBusy] = useState<"" | "x" | "p">("");
  const build = () => {
    const meta: DocMeta = {
      title: "التقرير المالي والمبيعات", storeName: db.settings.storeName, subtitle: db.settings.subtitle, phone: db.settings.phone, address: db.settings.address, footer: db.settings.footer,
      info: [["الفترة", `من ${from} إلى ${to}`], ["عدد الفواتير", num(r.count)], ["العملة", cur]],
      kpis: [["إجمالي المبيعات", money(r.gross, cur)], ["إجمالي الربح", money(r.profit, cur)], ["المصروفات", money(r.expenses, cur)], ["صافي الربح", money(r.net, cur)]],
    };
    const totalM = r.byMethod.reduce((a, m) => a + m.value, 0) || 1;
    const sections: Section[] = [
      { title: "الملخص المالي", head: ["البند", `القيمة (${cur})`], rows: summary.map(([k, v]) => [k, v]), numCols: [1], widths: [34, 20] },
      { title: "المبيعات حسب طريقة الدفع", head: ["طريقة الدفع", `المبلغ (${cur})`, "النسبة %"], rows: r.byMethod.map((m) => [m.name, m.value, Math.round((m.value / totalM) * 100)]), numCols: [1, 2], sumCols: [1] },
      { title: "أفضل 5 أصناف مبيعاً", head: ["الصنف", "الكمية", `الإيراد (${cur})`], rows: r.top.map((t) => [t.name, t.qty, t.total]), numCols: [1, 2], sumCols: [1, 2] },
      { title: "المبيعات اليومية", head: ["اليوم", `المبيعات (${cur})`], rows: r.daily.map((d) => [d.day, d.total]), numCols: [1], sumCols: [1] },
    ];
    return { meta, sections };
  };
  const exportFile = async (kind: "x" | "p") => {
    setBusy(kind);
    try {
      const { meta, sections } = build();
      const name = `تقرير-${from}_${to}.${kind === "x" ? "xlsx" : "pdf"}`;
      await shareFile(kind === "x" ? await excelReport(name, meta, sections) : await pdfReport(name, meta, sections), meta.title);
    } catch { toast.error("تعذر إنشاء الملف"); } finally { setBusy(""); }
  };

  const SummaryTable = () => (
    <table className="w-full">
      <tbody>{summary.map(([k, v], i) => (
        <tr key={k} className="border-b border-border/50"><td className={td}>{k}</td><td className={`${td} text-left font-bold ${i === 4 ? (v >= 0 ? "text-primary" : "text-destructive") : ""}`}>{money(v, cur)}</td></tr>
      ))}</tbody>
    </table>
  );

  return (
    <div>
      <PageHeader title="التقارير والتحليلات" icon={BarChart3} actions={<>
        <Button onClick={() => setPreview(true)}><Printer /> معاينة وطباعة التقرير</Button>
        <Button variant="secondary" disabled={!!busy} onClick={() => exportFile("p")}>{busy === "p" ? <Loader2 className="animate-spin" /> : <FileText />} تصدير PDF</Button>
        <Button variant="outline" disabled={!!busy} onClick={() => exportFile("x")}>{busy === "x" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} تصدير Excel</Button>
      </>} />
      <div className="glass mb-4 flex flex-wrap items-end gap-3 rounded-2xl p-3">
        <label className="text-sm">من تاريخ<Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">إلى تاريخ<Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        <Button variant="secondary" onClick={() => preset("day")}>اليوم</Button>
        <Button variant="secondary" onClick={() => preset("week")}>هذا الأسبوع</Button>
        <Button variant="secondary" onClick={() => preset("month")}>هذا الشهر</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-4 lg:col-span-2">
          <h3 className="mb-3 font-bold">المبيعات اليومية</h3>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer><BarChart data={r.daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={(v) => num(v / 1000) + "k"} /><Tooltip formatter={(v: number) => money(v, cur)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} /><Bar dataKey="total" name="المبيعات" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 font-bold">المبيعات حسب طريقة الدفع</h3>
          <div className="h-64">
            <ResponsiveContainer><PieChart><Pie data={r.byMethod} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>{r.byMethod.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip formatter={(v: number) => money(v, cur)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} /><Legend /></PieChart></ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 font-bold">أفضل 5 أصناف مبيعاً</h3>
          <ol className="space-y-2">{r.top.map((t, i) => (
            <li key={t.name} className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{num(i + 1)}</span>{t.name}</span><span className="text-muted-foreground">{num(t.qty)} قطعة</span></li>
          ))}{r.top.length === 0 && <li className="text-sm text-muted-foreground">لا توجد مبيعات في الفترة</li>}</ol>
        </div>
        <div className={`${tableWrap} lg:col-span-2`}>
          <div className="p-4 pb-0 font-bold">الملخص المالي ({num(r.count)} فاتورة)</div>
          <SummaryTable />
        </div>
      </div>
      <Modal open={preview} onClose={() => setPreview(false)} title="معاينة التقرير" className="sm:max-w-2xl">
        <div className="print-area rounded-lg bg-receipt p-6 text-receipt-foreground">
          <h2 className="text-center text-lg font-extrabold">{db.settings.storeName} {db.settings.subtitle}</h2>
          <p className="mb-4 text-center text-sm">التقرير المالي للفترة من {from} إلى {to}</p>
          <table className="mb-4 w-full text-sm"><tbody>{summary.map(([k, v]) => <tr key={k} className="border-b"><td className="py-1.5">{k}</td><td className="text-left font-bold">{money(v, cur)}</td></tr>)}</tbody></table>
          <h3 className="mb-1 font-bold">حسب طريقة الدفع</h3>
          <table className="mb-4 w-full text-sm"><tbody>{r.byMethod.map((m) => <tr key={m.name} className="border-b"><td className="py-1">{m.name}</td><td className="text-left">{money(m.value, cur)}</td></tr>)}</tbody></table>
          <h3 className="mb-1 font-bold">الأصناف الأكثر مبيعاً</h3>
          <table className="w-full text-sm"><tbody>{r.top.map((t) => <tr key={t.name} className="border-b"><td className="py-1">{t.name}</td><td>{num(t.qty)}</td><td className="text-left">{money(t.total, cur)}</td></tr>)}</tbody></table>
        </div>
        <Button onClick={() => window.print()}><Printer /> طباعة</Button>
      </Modal>
    </div>
  );
}
// th kept for consistent table styling in future columns
void th;
