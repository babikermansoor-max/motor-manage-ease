import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Download, PackageX, Pencil, Plus, Search, SlidersHorizontal, Trash2, Upload, Wallet, Coins, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { excelReport, pdfReport, shareFile, type DocMeta, type Section } from "@/lib/doc-export";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES, setDB, uid, useDB, type Category, type Product } from "@/lib/store";
import { downloadCSV, money, num } from "@/lib/format";
import { Badge, Field, Modal, PageHeader, Stat, selectCls, tableWrap, td, th } from "@/components/erp/ui";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "المخزون وقطع الغيار | مجموعة عمر عبد الله" },
      { name: "description", content: "إدارة مخزون قطع غيار السيارات الكورية: الأرصدة، الرفوف، التكلفة، والاستيراد والتصدير إلى Excel." },
      { property: "og:title", content: "المخزون وقطع الغيار" },
      { property: "og:description", content: "متابعة أرصدة قطع الغيار والأصناف التي أوشكت على النفاد." },
    ],
  }),
  component: Inventory,
});

const empty = (): Product => ({ id: "", partNo: "", oem: "", barcode: "", name: "", brand: "Mobis", models: "", category: "المحرك", shelf: "", cost: 0, price: 0, stock: 0, min: 2 });
const HEADERS = ["رقم القطعة", "OEM", "الباركود", "الاسم", "الماركة", "الموديلات", "التصنيف", "الرف", "سعر التكلفة", "سعر البيع", "الكمية", "الحد الأدنى"];

function Inventory() {
  const { products, settings } = useDB();
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [cat, setCat] = useState("الكل");
  const [edit, setEdit] = useState<Product | null>(null);
  const [adjust, setAdjust] = useState<Product | null>(null);
  const [del, setDel] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const cur = settings.currency;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => (!lowOnly || p.stock <= p.min) && (cat === "الكل" || p.category === cat) &&
      (!s || [p.name, p.partNo, p.oem, p.barcode, p.models, p.shelf].some((f) => f.toLowerCase().includes(s))));
  }, [products, q, lowOnly, cat]);

  const [busy, setBusy] = useState<"" | "x" | "p">("");
  const exportFile = async (kind: "x" | "p") => {
    setBusy(kind);
    try {
      const src = list;
      const date = new Date().toISOString().slice(0, 10);
      const meta: DocMeta = {
        title: lowOnly ? "قائمة الأصناف الناقصة" : "تقرير جرد المخزون", storeName: settings.storeName, subtitle: settings.subtitle, phone: settings.phone, address: settings.address, footer: settings.footer,
        info: [["تاريخ الجرد", new Date().toLocaleString("ar-EG")], ["التصنيف", cat], ["عدد الأصناف", num(src.length)]],
        kpis: [["قيمة المخزون (تكلفة)", money(src.reduce((s, p) => s + p.cost * p.stock, 0), cur)], ["قيمة المخزون (بيع)", money(src.reduce((s, p) => s + p.price * p.stock, 0), cur)], ["أصناف نفدت", num(src.filter((p) => p.stock === 0).length)], ["أصناف منخفضة", num(src.filter((p) => p.stock > 0 && p.stock <= p.min).length)]],
      };
      const pdf = kind === "p";
      const sec: Section = pdf
        ? { title: "تفاصيل الأصناف", head: ["رقم القطعة", "الاسم", "الموديل", "الرف", "التكلفة", "البيع", "الكمية", "الحد الأدنى", "القيمة"], rows: src.map((p) => [p.partNo, p.name, p.models, p.shelf, p.cost, p.price, p.stock, p.min, p.cost * p.stock]), numCols: [4, 5, 6, 7, 8], sumCols: [6, 8], tone: (i) => (src[i].stock === 0 ? "danger" : src[i].stock <= src[i].min ? "warn" : undefined) }
        : { title: "تفاصيل الأصناف", head: [...HEADERS, "قيمة المخزون (تكلفة)", "الحالة"], rows: src.map((p) => [p.partNo, p.oem, p.barcode, p.name, p.brand, p.models, p.category, p.shelf, p.cost, p.price, p.stock, p.min, p.cost * p.stock, p.stock === 0 ? "نفد" : p.stock <= p.min ? "منخفض" : "متوفر"]), numCols: [8, 9, 10, 11, 12], sumCols: [10, 12], formulas: { 12: (r) => `I${r}*K${r}` }, widths: [16, 16, 16, 30, 10, 18, 16, 8, 12, 12, 9, 10, 18, 10], tone: (i) => (src[i].stock === 0 ? "danger" : src[i].stock <= src[i].min ? "warn" : undefined) };
      const name = `${lowOnly ? "نواقص" : "جرد-المخزون"}-${date}.${pdf ? "pdf" : "xlsx"}`;
      await shareFile(pdf ? await pdfReport(name, meta, [sec]) : await excelReport(name, meta, [sec]), meta.title);
    } catch { toast.error("تعذر إنشاء الملف"); } finally { setBusy(""); }
  };

  return (
    <div>
      <PageHeader title="المخزون وقطع الغيار" subtitle="جميع الأصناف وأرصدتها ومواقعها" icon={Boxes} actions={<>
        <Button onClick={() => setEdit(empty())}><Plus /> إضافة قطعة غيار جديدة</Button>
        <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload /> استيراد من Excel</Button>
        <Button variant="outline" disabled={!!busy} onClick={() => exportFile("x")}>{busy === "x" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} تصدير Excel</Button>
        <Button variant="outline" disabled={!!busy} onClick={() => exportFile("p")}>{busy === "p" ? <Loader2 className="animate-spin" /> : <FileText />} تصدير PDF</Button>
      </>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="إجمالي الأصناف" value={num(products.length)} icon={Boxes} />
        <Stat label="قيمة المخزون (تكلفة)" value={money(products.reduce((s, p) => s + p.cost * p.stock, 0), cur)} icon={Wallet} tone="accent" />
        <Stat label="قيمة المخزون (بيع)" value={money(products.reduce((s, p) => s + p.price * p.stock, 0), cur)} icon={Coins} />
        <Stat label="أصناف نفدت" value={num(products.filter((p) => p.stock === 0).length)} icon={PackageX} tone="destructive" />
      </div>
      <div className="glass mb-4 flex flex-col gap-3 rounded-2xl p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} className="pr-10" placeholder="بحث بالاسم أو الرقم أو الموديل أو الرف" />
        </div>
        <select className={`${selectCls} md:w-52`} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="التصنيف">
          <option>الكل</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm"><Switch checked={lowOnly} onCheckedChange={setLowOnly} /> <AlertTriangle className="h-4 w-4 text-accent" /> أصناف أوشكت على النفاد</label>
      </div>
      <div className={tableWrap}>
        <table className="w-full">
          <thead className="border-b border-border"><tr>
            {["رقم القطعة / الباركود", "الاسم", "الماركة", "الموديل", "التصنيف", "الرف", "التكلفة", "البيع", "المتوفر", "الحد الأدنى", "الحالة", "إجراءات"].map((h) => <th key={h} className={th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className={td}><div className="font-mono" dir="ltr">{p.partNo}</div><div className="text-xs text-muted-foreground" dir="ltr">{p.barcode}</div></td>
                <td className={`${td} font-semibold`}>{p.name}</td>
                <td className={td}><Badge tone={p.brand === "Mobis" ? "primary" : "accent"}>{p.brand}</Badge></td>
                <td className={td}>{p.models}</td>
                <td className={td}>{p.category}</td>
                <td className={td}>{p.shelf}</td>
                <td className={td}>{money(p.cost, cur)}</td>
                <td className={`${td} text-primary`}>{money(p.price, cur)}</td>
                <td className={`${td} font-bold`}>{num(p.stock)}</td>
                <td className={td}>{num(p.min)}</td>
                <td className={td}>{p.stock === 0 ? <Badge tone="destructive">نفد</Badge> : p.stock <= p.min ? <Badge tone="accent">منخفض</Badge> : <Badge>متوفر</Badge>}</td>
                <td className={td}>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label="تعديل" onClick={() => setEdit(p)}><Pencil /></Button>
                    <Button size="icon" variant="ghost" aria-label="تسوية مخزون" onClick={() => setAdjust(p)}><SlidersHorizontal /></Button>
                    <Button size="icon" variant="ghost" aria-label="حذف" className="text-destructive" onClick={() => setDel(p)}><Trash2 /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="py-10 text-center text-muted-foreground">لا توجد أصناف مطابقة</div>}
      </div>
      <ProductForm product={edit} onClose={() => setEdit(null)} />
      <AdjustModal product={adjust} onClose={() => setAdjust(null)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <Modal open={!!del} onClose={() => setDel(null)} title="حذف الصنف" description={`هل تريد حذف "${del?.name}" نهائياً؟`}>
        <div className="flex gap-2">
          <Button variant="destructive" className="flex-1" onClick={() => { setDB((d) => ({ ...d, products: d.products.filter((x) => x.id !== del!.id) })); toast.success("تم الحذف"); setDel(null); }}>حذف</Button>
          <Button variant="outline" className="flex-1" onClick={() => setDel(null)}>إلغاء</Button>
        </div>
      </Modal>
    </div>
  );
}

function ProductForm({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [f, setF] = useState<Product>(empty());
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [lastId, setLastId] = useState<string | null>(null);
  const key = product ? product.id || "new" : null;
  if (key !== lastId) { setLastId(key); if (product) { setF(product); setErrs({}); } }
  const { products } = useDB();
  const up = <K extends keyof Product>(k: K, v: Product[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "اسم القطعة مطلوب";
    if (!f.partNo.trim()) e.partNo = "رقم القطعة مطلوب";
    else if (products.some((p) => p.partNo === f.partNo.trim() && p.id !== f.id)) e.partNo = "رقم القطعة مستخدم مسبقاً";
    if (f.price <= 0) e.price = "سعر البيع يجب أن يكون أكبر من صفر";
    if (f.cost < 0) e.cost = "قيمة غير صحيحة";
    if (f.price < f.cost) e.price = "سعر البيع أقل من التكلفة";
    if (f.stock < 0) e.stock = "قيمة غير صحيحة";
    setErrs(e);
    if (Object.keys(e).length) return;
    const p = { ...f, partNo: f.partNo.trim(), name: f.name.trim(), barcode: f.barcode || f.partNo.trim() };
    setDB((d) => ({ ...d, products: f.id ? d.products.map((x) => (x.id === f.id ? p : x)) : [{ ...p, id: uid() }, ...d.products] }));
    toast.success(f.id ? "تم تحديث الصنف" : "تمت إضافة الصنف"); onClose();
  };
  const n = (k: "cost" | "price" | "stock" | "min") => <Input type="number" min={0} value={f[k]} onChange={(e) => up(k, Number(e.target.value))} />;
  return (
    <Modal open={!!product} onClose={onClose} title={f.id ? "تعديل قطعة غيار" : "إضافة قطعة غيار جديدة"} className="sm:max-w-2xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="اسم القطعة *" error={errs.name}><Input value={f.name} onChange={(e) => up("name", e.target.value)} /></Field>
        <Field label="رقم القطعة *" error={errs.partNo}><Input dir="ltr" value={f.partNo} onChange={(e) => up("partNo", e.target.value)} /></Field>
        <Field label="كود OEM"><Input dir="ltr" value={f.oem} onChange={(e) => up("oem", e.target.value)} /></Field>
        <Field label="الباركود"><Input dir="ltr" value={f.barcode} onChange={(e) => up("barcode", e.target.value)} /></Field>
        <Field label="الماركة"><select className={selectCls} value={f.brand} onChange={(e) => up("brand", e.target.value)}><option>Mobis</option><option>Genuine</option><option>تجاري</option></select></Field>
        <Field label="التصنيف"><select className={selectCls} value={f.category} onChange={(e) => up("category", e.target.value as Category)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="الموديلات المتوافقة"><Input value={f.models} onChange={(e) => up("models", e.target.value)} placeholder="أكسنت، توسان" /></Field>
        <Field label="الموقع / الرف"><Input value={f.shelf} onChange={(e) => up("shelf", e.target.value)} placeholder="A-01" /></Field>
        <Field label="سعر التكلفة" error={errs.cost}>{n("cost")}</Field>
        <Field label="سعر البيع *" error={errs.price}>{n("price")}</Field>
        <Field label="الكمية المتوفرة" error={errs.stock}>{n("stock")}</Field>
        <Field label="الحد الأدنى للتنبيه">{n("min")}</Field>
      </div>
      <Button className="w-full" onClick={save}>حفظ</Button>
    </Modal>
  );
}

function AdjustModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [qty, setQty] = useState(0);
  const [mode, setMode] = useState<"add" | "sub" | "set">("add");
  if (!product) return null;
  const next = mode === "add" ? product.stock + qty : mode === "sub" ? product.stock - qty : qty;
  return (
    <Modal open onClose={onClose} title="تسوية المخزون" description={`${product.name} — الرصيد الحالي ${num(product.stock)}`}>
      <div className="space-y-3">
        <select className={selectCls} value={mode} onChange={(e) => setMode(e.target.value as "add" | "sub" | "set")}>
          <option value="add">إضافة كمية</option><option value="sub">خصم كمية (تالف / فاقد)</option><option value="set">تحديد الرصيد الفعلي (جرد)</option>
        </select>
        <Input type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        <p className="text-sm">الرصيد بعد التسوية: <b className={next < 0 ? "text-destructive" : "text-primary"}>{num(next)}</b></p>
        <Button className="w-full" disabled={next < 0} onClick={() => { setDB((d) => ({ ...d, products: d.products.map((p) => (p.id === product.id ? { ...p, stock: next } : p)) })); toast.success("تمت التسوية"); setQty(0); onClose(); }}>تأكيد التسوية</Button>
      </div>
    </Modal>
  );
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<Product[]>([]);
  const onFile = async (file: File) => {
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array", codepage: 65001 });
    const data = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1).filter((r) => r.length > 3 && r[0]);
    const parsed = data.map((r): Product => ({
      id: uid(), partNo: String(r[0]), oem: String(r[1] ?? ""), barcode: String(r[2] ?? r[0]), name: String(r[3] ?? ""), brand: String(r[4] ?? "Mobis"),
      models: String(r[5] ?? ""), category: (CATEGORIES.includes(r[6] as Category) ? r[6] : "المحرك") as Category, shelf: String(r[7] ?? ""),
      cost: Number(r[8]) || 0, price: Number(r[9]) || 0, stock: Number(r[10]) || 0, min: Number(r[11]) || 2,
    })).filter((p) => p.name);
    setRows(parsed);
    if (!parsed.length) toast.error("لم يتم العثور على صفوف صالحة في الملف");
  };
  const commit = () => {
    setDB((d) => {
      const byNo = new Map(d.products.map((p) => [p.partNo, p]));
      rows.forEach((r) => { const ex = byNo.get(r.partNo); byNo.set(r.partNo, ex ? { ...r, id: ex.id, stock: ex.stock + r.stock } : r); });
      return { ...d, products: [...byNo.values()] };
    });
    toast.success(`تم استيراد ${num(rows.length)} صنف`); setRows([]); onClose();
  };
  const template = () => downloadCSV("inventory-template.csv", HEADERS, [["26300-35505", "26300-35503", "8802630035505", "فلتر زيت", "Mobis", "أكسنت", "الفلاتر", "A-01", 4500, 7000, 10, 3]]);
  return (
    <Modal open={open} onClose={() => { setRows([]); onClose(); }} title="استيراد من Excel" description="ارفع ملف CSV أو Excel بنفس ترتيب أعمدة التصدير. الأصناف الموجودة برقم القطعة تُحدَّث وتُضاف كمياتها." className="sm:max-w-2xl">
      <div className="space-y-3">
        <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <Button variant="link" className="px-0" onClick={template}>تحميل نموذج الملف</Button>
        {rows.length > 0 && (
          <div className="max-h-60 overflow-auto rounded-lg border border-border text-sm">
            <table className="w-full"><tbody>
              {rows.map((r) => <tr key={r.id} className="border-b border-border/50"><td className="p-2 font-mono" dir="ltr">{r.partNo}</td><td className="p-2">{r.name}</td><td className="p-2">{num(r.stock)}</td><td className="p-2">{num(r.price)}</td></tr>)}
            </tbody></table>
          </div>
        )}
        <Button className="w-full" disabled={!rows.length} onClick={commit}>استيراد {rows.length ? num(rows.length) : ""} صنف</Button>
      </div>
    </Modal>
  );
}
