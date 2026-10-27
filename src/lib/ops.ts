// Pure operations applied identically on the device and on the server (inside a locked transaction).
import type { DB, PayMethod, Purchase, Sale, SaleItem, Transfer } from "./store";

export const GENERAL_CUSTOMER = "general";
export const MAIN_WH = "main";
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function computeTotals(items: { price: number; qty: number }[], discountValue: number, discountType: "amount" | "percent") {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const raw = discountType === "percent" ? (subtotal * Math.min(Math.max(discountValue, 0), 100)) / 100 : Math.max(discountValue, 0);
  const discount = Math.min(Math.round(raw), subtotal);
  return { subtotal, discount, total: subtotal - discount };
}
export function whQty(db: DB, productId: string, wh: string) {
  if (wh === MAIN_WH) return db.products.find((p) => p.id === productId)?.stock ?? 0;
  return db.whStock[wh]?.[productId] ?? 0;
}

type Lines = { productId: string; qty: number }[];
export type OpBody =
  | { kind: "checkout"; saleId: string; cart: Lines; customerId: string; method: PayMethod; discountValue: number; discountType: "amount" | "percent"; cashier: string }
  | { kind: "returnSale"; saleId: string }
  | { kind: "purchase"; purchaseId: string; supplierId: string; items: { productId: string; qty: number; cost: number }[]; paidNow: boolean }
  | { kind: "paySupplier"; supplierId: string; amount: number; method: "cash" | "bankak" }
  | { kind: "collectDebt"; customerId: string; amount: number; method: "cash" | "bankak" }
  | { kind: "expense"; category: string; amount: number; method: "cash" | "bankak"; note: string }
  | { kind: "transfer"; transferId: string; from: string; to: string; items: Lines; note: string; by: string }
  | { kind: "patch"; patch: Patch }
  | { kind: "replace"; data: DB };
export type Op = OpBody & { id: string; at: string };

const COLS = ["employees", "warehouses", "transfers", "products", "customers", "suppliers", "sales", "purchases", "txs"] as const;
type Col = (typeof COLS)[number];
export type Patch = {
  cols: Partial<Record<Col, { up: { id: string }[]; del: string[] }>>;
  whStock?: Record<string, Record<string, number> | null>;
  settings?: DB["settings"]; openingBalance?: number;
};

export function diffPatch(prev: DB, next: DB): Patch | null {
  const p: Patch = { cols: {} }; let any = false;
  for (const c of COLS) {
    const a = prev[c] as { id: string }[], b = next[c] as { id: string }[];
    if (a === b) continue;
    const am = new Map(a.map((x) => [x.id, JSON.stringify(x)]));
    const bIds = new Set(b.map((x) => x.id));
    const up = b.filter((x) => am.get(x.id) !== JSON.stringify(x));
    const del = a.filter((x) => !bIds.has(x.id)).map((x) => x.id);
    if (up.length || del.length) { p.cols[c] = { up, del }; any = true; }
  }
  if (prev.whStock !== next.whStock) {
    const ws: Patch["whStock"] = {};
    for (const k of new Set([...Object.keys(prev.whStock), ...Object.keys(next.whStock)]))
      if (JSON.stringify(prev.whStock[k]) !== JSON.stringify(next.whStock[k])) ws[k] = next.whStock[k] ?? null;
    if (Object.keys(ws).length) { p.whStock = ws; any = true; }
  }
  if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) { p.settings = next.settings; any = true; }
  if (prev.openingBalance !== next.openingBalance) { p.openingBalance = next.openingBalance; any = true; }
  return any ? p : null;
}

function applyPatch(db: DB, p: Patch): DB {
  const out = { ...db } as DB & Record<string, unknown>;
  for (const c of COLS) {
    const ch = p.cols[c]; if (!ch) continue;
    const del = new Set(ch.del); const up = new Map(ch.up.map((x) => [x.id, x]));
    const cur = (db[c] as { id: string }[]).filter((x) => !del.has(x.id)).map((x) => up.get(x.id) ?? x);
    const ids = new Set(cur.map((x) => x.id));
    const added = ch.up.filter((x) => !ids.has(x.id));
    // new rows: lists that are newest-first get prepended
    out[c] = (["sales", "txs", "purchases", "transfers", "products"].includes(c) ? [...added, ...cur] : [...cur, ...added]) as never;
  }
  if (p.whStock) {
    const ws = { ...db.whStock };
    for (const [k, v] of Object.entries(p.whStock)) { if (v) ws[k] = v; else delete ws[k]; }
    out.whStock = ws;
  }
  if (p.settings) out.settings = p.settings;
  if (p.openingBalance !== undefined) out.openingBalance = p.openingBalance;
  return out;
}

export function applyOp(d: DB, op: Op): DB {
  const at = op.at;
  switch (op.kind) {
    case "replace": return op.data;
    case "patch": return applyPatch(d, op.patch);
    case "checkout": {
      if (d.sales.some((s) => s.id === op.saleId)) return d;
      if (op.method === "credit" && op.customerId === GENERAL_CUSTOMER) throw new Error("البيع الآجل يتطلب اختيار عميل مسجل");
      const items: SaleItem[] = op.cart.map((c) => {
        const p = d.products.find((x) => x.id === c.productId);
        if (!p) throw new Error("صنف غير موجود");
        if (c.qty > p.stock) throw new Error(`الكمية غير متوفرة: ${p.name} (المتوفر ${p.stock})`);
        return { productId: p.id, name: p.name, partNo: p.partNo, price: p.price, cost: p.cost, qty: c.qty };
      });
      if (!items.length) throw new Error("السلة فارغة");
      const t = computeTotals(items, op.discountValue, op.discountType);
      const cust = d.customers.find((c) => c.id === op.customerId);
      if (!cust) throw new Error("العميل غير موجود");
      const no = Math.max(1000, ...d.sales.map((s) => s.no)) + 1;
      const sale: Sale = { id: op.saleId, no, date: at, customerId: op.customerId, customerName: cust.name, items, ...t, method: op.method, cashier: op.cashier };
      return {
        ...d,
        products: d.products.map((p) => { const q = items.filter((i) => i.productId === p.id).reduce((s, i) => s + i.qty, 0); return q ? { ...p, stock: p.stock - q } : p; }),
        customers: d.customers.map((c) => c.id === op.customerId && c.id !== GENERAL_CUSTOMER ? { ...c, debt: c.debt + (op.method === "credit" ? t.total : 0), points: c.points + Math.floor(t.total / 1000) } : c),
        sales: [sale, ...d.sales],
        txs: op.method === "credit" ? d.txs : [{ id: "tx-" + op.id, date: at, type: "مبيعات", dir: "in", amount: t.total, method: op.method, note: `فاتورة مبيعات #${no}` }, ...d.txs],
      };
    }
    case "returnSale": {
      const s = d.sales.find((x) => x.id === op.saleId);
      if (!s) throw new Error("الفاتورة غير موجودة");
      if (s.returned) throw new Error(`الفاتورة #${s.no} مرتجعة مسبقاً`);
      return {
        ...d,
        sales: d.sales.map((x) => (x.id === op.saleId ? { ...x, returned: true } : x)),
        products: d.products.map((p) => { const q = s.items.filter((i) => i.productId === p.id).reduce((a, i) => a + i.qty, 0); return q ? { ...p, stock: p.stock + q } : p; }),
        customers: d.customers.map((c) => c.id === s.customerId && s.method === "credit" ? { ...c, debt: Math.max(0, c.debt - s.total) } : c),
        txs: s.method === "credit" ? d.txs : [{ id: "tx-" + op.id, date: at, type: "مرتجعات", dir: "out", amount: s.total, method: s.method, note: `مرتجع فاتورة #${s.no}` }, ...d.txs],
      };
    }
    case "purchase": {
      if (d.purchases.some((p) => p.id === op.purchaseId)) return d;
      const sup = d.suppliers.find((s) => s.id === op.supplierId);
      if (!sup) throw new Error("اختر المورد");
      const valid = op.items.filter((i) => i.qty > 0);
      if (!valid.length) throw new Error("أضف أصنافاً للفاتورة");
      const total = valid.reduce((s, i) => s + i.qty * i.cost, 0);
      const no = Math.max(500, ...d.purchases.map((p) => p.no)) + 1;
      const pur: Purchase = { id: op.purchaseId, no, date: at, supplierId: sup.id, supplierName: sup.name, items: valid.map((i) => ({ ...i, name: d.products.find((p) => p.id === i.productId)?.name ?? "" })), total };
      return {
        ...d,
        purchases: [pur, ...d.purchases],
        products: d.products.map((p) => { const it = valid.filter((i) => i.productId === p.id); return it.length ? { ...p, stock: p.stock + it.reduce((a, i) => a + i.qty, 0), cost: it[it.length - 1].cost } : p; }),
        suppliers: op.paidNow ? d.suppliers : d.suppliers.map((s) => (s.id === sup.id ? { ...s, balance: s.balance + total } : s)),
        txs: op.paidNow ? [{ id: "tx-" + op.id, date: at, type: "مشتريات", dir: "out", amount: total, method: "cash", note: `فاتورة مشتريات #${no} - ${sup.name}` }, ...d.txs] : d.txs,
      };
    }
    case "paySupplier": {
      const s = d.suppliers.find((x) => x.id === op.supplierId);
      if (!s) throw new Error("المورد غير موجود");
      return { ...d, suppliers: d.suppliers.map((x) => (x.id === s.id ? { ...x, balance: Math.max(0, x.balance - op.amount) } : x)), txs: [{ id: "tx-" + op.id, date: at, type: "سداد ديون", dir: "out", amount: op.amount, method: op.method, note: `سداد للمورد: ${s.name}` }, ...d.txs] };
    }
    case "collectDebt": {
      const c = d.customers.find((x) => x.id === op.customerId);
      if (!c) throw new Error("العميل غير موجود");
      return { ...d, customers: d.customers.map((x) => (x.id === c.id ? { ...x, debt: Math.max(0, x.debt - op.amount) } : x)), txs: [{ id: "tx-" + op.id, date: at, type: "تحصيل ديون", dir: "in", amount: op.amount, method: op.method, note: `تحصيل من: ${c.name}` }, ...d.txs] };
    }
    case "expense":
      return { ...d, txs: [{ id: "tx-" + op.id, date: at, type: "مصروفات", dir: "out", amount: op.amount, method: op.method, note: `${op.category}: ${op.note || op.category}` }, ...d.txs] };
    case "transfer": {
      if (d.transfers.some((t) => t.id === op.transferId)) return d;
      if (!op.from || !op.to || op.from === op.to) throw new Error("اختر مخزنين مختلفين");
      const valid = op.items.filter((i) => i.qty > 0);
      if (!valid.length) throw new Error("أضف أصنافاً للتحويل");
      for (const i of valid) if (i.qty > whQty(d, i.productId, op.from)) throw new Error(`الكمية غير متوفرة بالمخزن المصدر: ${d.products.find((p) => p.id === i.productId)?.name}`);
      const name = (id: string) => d.warehouses.find((w) => w.id === id)?.name ?? id;
      const no = Math.max(100, ...d.transfers.map((t) => t.no)) + 1;
      const tr: Transfer = { id: op.transferId, no, date: at, from: op.from, to: op.to, fromName: name(op.from), toName: name(op.to), items: valid.map((i) => ({ ...i, name: d.products.find((p) => p.id === i.productId)?.name ?? "" })), by: op.by, note: op.note };
      const ws = { ...d.whStock }; let products = d.products;
      const apply = (wh: string, pid: string, delta: number) => {
        if (wh === MAIN_WH) products = products.map((p) => (p.id === pid ? { ...p, stock: p.stock + delta } : p));
        else ws[wh] = { ...(ws[wh] ?? {}), [pid]: (ws[wh]?.[pid] ?? 0) + delta };
      };
      for (const i of valid) { apply(op.from, i.productId, -i.qty); apply(op.to, i.productId, i.qty); }
      return { ...d, products, whStock: ws, transfers: [tr, ...d.transfers] };
    }
  }
}
