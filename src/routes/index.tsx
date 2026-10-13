import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, Minus, Plus, Search, ShoppingCart, Store, Trash2, UserPlus, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, GENERAL_CUSTOMER, PAY_LABEL, checkout, computeTotals, useDB, type PayMethod, type Sale } from "@/lib/store";
import { money, num } from "@/lib/format";
import { Badge, Modal, selectCls } from "@/components/erp/ui";
import { ReceiptModal } from "@/components/erp/Receipt";
import { QuickCustomer } from "@/components/erp/QuickCustomer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نقطة البيع | مجموعة عمر عبد الله لقطع الغيار الكورية" },
      { name: "description", content: "كاشير سريع لبيع قطع غيار هيونداي وكيا مع بحث برقم القطعة والموديل وطباعة فاتورة حرارية." },
      { property: "og:title", content: "نقطة البيع - قطع غيار السيارات الكورية" },
      { property: "og:description", content: "بيع وطباعة فواتير قطع الغيار الكورية بسهولة." },
    ],
  }),
  component: POS,
});

type CartLine = { productId: string; qty: number };

function POS() {
  const db = useDB();
  const { products, customers, settings } = db;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("الكل");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState(GENERAL_CUSTOMER);
  const [method, setMethod] = useState<PayMethod>("cash");
  const [discount, setDiscount] = useState(0);
  const [dType, setDType] = useState<"amount" | "percent">("amount");
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [addCust, setAddCust] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => (cat === "الكل" || p.category === cat) &&
      (!s || [p.name, p.partNo, p.oem, p.models, p.barcode, p.brand].some((f) => f.toLowerCase().includes(s))));
  }, [products, q, cat]);

  const lines = cart.map((c) => ({ ...c, p: products.find((p) => p.id === c.productId)! })).filter((l) => l.p);
  const totals = computeTotals(lines.map((l) => ({ price: l.p.price, qty: l.qty })), discount, dType);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  const add = (id: string) => {
    const p = products.find((x) => x.id === id)!;
    const inCart = cart.find((c) => c.productId === id)?.qty ?? 0;
    if (inCart >= p.stock) return toast.error(`لا يوجد مخزون كافٍ من ${p.name}`);
    setCart((c) => (inCart ? c.map((l) => (l.productId === id ? { ...l, qty: l.qty + 1 } : l)) : [...c, { productId: id, qty: 1 }]));
  };
  const setQty = (id: string, qty: number) => {
    const p = products.find((x) => x.id === id)!;
    if (qty > p.stock) return toast.error("الكمية تتجاوز المخزون المتاح");
    setCart((c) => (qty <= 0 ? c.filter((l) => l.productId !== id) : c.map((l) => (l.productId === id ? { ...l, qty } : l))));
  };
  const reset = () => { setCart([]); setDiscount(0); setCustomerId(GENERAL_CUSTOMER); setMethod("cash"); };
  const complete = () => {
    try {
      const s = checkout(cart, customerId, method, discount, dType);
      setReceipt(s); setCartOpen(false); toast.success(`تم حفظ الفاتورة #${num(s.no)}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  const cartPanel = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingCart className="h-5 w-5 text-primary" /> سلة البيع</h2>
        {cart.length > 0 && <Button size="sm" variant="ghost" onClick={() => setCart([])}>تفريغ</Button>}
      </div>
      <div className="min-h-[120px] flex-1 space-y-2 overflow-y-auto">
        {lines.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">السلة فارغة — أضف قطعاً من القائمة</div>}
        {lines.map((l) => (
          <div key={l.productId} className="rounded-xl border border-border bg-background/40 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{l.p.name}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">{l.p.partNo}</div>
              </div>
              <button aria-label="حذف" onClick={() => setQty(l.productId, 0)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.productId, l.qty + 1)}><Plus /></Button>
                <span className="w-8 text-center text-sm font-bold">{num(l.qty)}</span>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.productId, l.qty - 1)}><Minus /></Button>
              </div>
              <div className="text-left text-xs text-muted-foreground">{num(l.p.price)} ×</div>
              <div className="text-sm font-bold text-primary">{money(l.p.price * l.qty, settings.currency)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3 border-t border-border pt-3">
        <div className="flex gap-2">
          <select className={selectCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)} aria-label="العميل">
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button size="icon" variant="outline" onClick={() => setAddCust(true)} aria-label="إضافة عميل"><UserPlus /></Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(PAY_LABEL) as PayMethod[]).map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={cn("rounded-lg border py-2 text-sm font-semibold transition", method === m ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>{PAY_LABEL[m]}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input type="number" min={0} value={discount || ""} placeholder="الخصم" onChange={(e) => setDiscount(Number(e.target.value))} />
          <select className={cn(selectCls, "w-28")} value={dType} onChange={(e) => setDType(e.target.value as "amount" | "percent")} aria-label="نوع الخصم">
            <option value="amount">مبلغ</option><option value="percent">نسبة %</option>
          </select>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">المجموع</span><span>{money(totals.subtotal, settings.currency)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">الخصم</span><span className="text-accent">- {money(totals.discount, settings.currency)}</span></div>
          <div className="flex justify-between text-lg font-extrabold"><span>الصافي</span><span className="text-primary">{money(totals.total, settings.currency)}</span></div>
        </div>
        <Button className="h-11 w-full text-base font-bold" disabled={!cart.length} onClick={complete}>إتمام وطباعة الفاتورة</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="min-w-0 flex-1">
        <div className="glass mb-4 grid grid-cols-1 gap-2 rounded-2xl p-3 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> الكاشير: <b>{settings.cashier}</b></div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-accent" /> الوردية من {settings.shiftStart} · {now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="flex min-w-0 items-center gap-2"><Store className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{settings.storeName} — الفرع الرئيسي</span></div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="h-11 bg-background/60 pr-10" placeholder="ابحث باسم الاسبير، رقم القطعة، OEM، الموديل (أكسنت، توسان...) أو الباركود" />
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {["الكل", ...CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn("whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition", cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/40 text-muted-foreground hover:text-foreground")}>{c}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((p) => {
            const low = p.stock <= p.min;
            return (
              <div key={p.id} className="glass flex flex-col rounded-2xl p-4 transition hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-mono text-muted-foreground" dir="ltr">{p.partNo}</span>
                  <Badge tone={p.brand === "Mobis" ? "primary" : "accent"}>{p.brand}</Badge>
                </div>
                <h3 className="mt-2 font-bold">{p.name}</h3>
                <p className="text-xs text-muted-foreground">يناسب: {p.models}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className={cn("text-xs font-semibold", p.stock === 0 ? "text-destructive" : low ? "text-destructive" : "text-muted-foreground")}>
                    {p.stock === 0 ? "نفد المخزون" : `المتوفر: ${num(p.stock)}${low ? " ⚠" : ""}`}
                  </span>
                  <span className="text-lg font-extrabold text-primary">{money(p.price, settings.currency)}</span>
                </div>
                <Button className="mt-3" size="sm" disabled={p.stock === 0} onClick={() => add(p.id)}><Plus /> إضافة للسلة</Button>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground">لا توجد نتائج مطابقة للبحث</div>}
        </div>
      </div>

      <aside className="glass sticky top-4 hidden h-[calc(100vh-2rem)] w-[380px] shrink-0 rounded-2xl p-4 xl:block">{cartPanel}</aside>

      <button onClick={() => setCartOpen(true)} className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground shadow-lg xl:hidden">
        <ShoppingCart className="h-5 w-5" /> {num(count)} · {money(totals.total, settings.currency)}
      </button>
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="سلة البيع">{cartPanel}</Modal>

      <ReceiptModal sale={receipt} onClose={() => { setReceipt(null); reset(); }} onNew={reset} />
      <QuickCustomer open={addCust} onClose={() => setAddCust(false)} onCreated={setCustomerId} />
    </div>
  );
}

