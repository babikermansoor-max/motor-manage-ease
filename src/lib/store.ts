import { useSyncExternalStore } from "react";

export type Category = "المحرك" | "الفرامل" | "المساعدين والتعليق" | "الكهرباء والحساسات" | "السيور" | "الفلاتر";
export const CATEGORIES: Category[] = ["المحرك", "الفرامل", "المساعدين والتعليق", "الكهرباء والحساسات", "السيور", "الفلاتر"];
export type PayMethod = "cash" | "bankak" | "credit";
export const PAY_LABEL: Record<PayMethod, string> = { cash: "كاش", bankak: "بنكك", credit: "آجل" };

export interface Product {
  id: string; partNo: string; oem: string; barcode: string; name: string; brand: string;
  models: string; category: Category; shelf: string; cost: number; price: number; stock: number; min: number;
}
export interface Customer { id: string; name: string; phone: string; car: string; debt: number; points: number }
export interface Supplier { id: string; name: string; phone: string; company: string; balance: number }
export interface SaleItem { productId: string; name: string; partNo: string; price: number; cost: number; qty: number }
export interface Sale {
  id: string; no: number; date: string; customerId: string; customerName: string; items: SaleItem[];
  subtotal: number; discount: number; total: number; method: PayMethod; cashier: string; returned?: boolean;
}
export interface Purchase { id: string; no: number; date: string; supplierId: string; supplierName: string; items: { productId: string; name: string; qty: number; cost: number }[]; total: number }
export type TxType = "مبيعات" | "مشتريات" | "مصروفات" | "سداد ديون" | "تحصيل ديون" | "مرتجعات";
export interface Tx { id: string; date: string; type: TxType; dir: "in" | "out"; amount: number; method: "cash" | "bankak"; note: string }
export interface Settings { storeName: string; subtitle: string; phone: string; address: string; currency: string; footer: string; cashier: string; shiftStart: string }
export const PERMS = [
  { key: "pos", label: "نقطة البيع", to: "/" }, { key: "inventory", label: "المخزون", to: "/inventory" },
  { key: "sales", label: "المبيعات والمرتجعات", to: "/sales" }, { key: "purchases", label: "المشتريات", to: "/purchases" },
  { key: "customers", label: "العملاء والموردين", to: "/customers" }, { key: "treasury", label: "الخزينة", to: "/treasury" },
  { key: "reports", label: "التقارير", to: "/reports" }, { key: "branches", label: "الفروع والمخازن", to: "/branches" },
  { key: "transfers", label: "التحويل بين المخازن", to: "/transfers" }, { key: "staff", label: "الموظفين والصلاحيات", to: "/staff" },
  { key: "settings", label: "الإعدادات", to: "/settings" },
] as const;
export type Perm = (typeof PERMS)[number]["key"];
export const ALL_PERMS = PERMS.map((p) => p.key) as Perm[];
export interface Employee { id: string; name: string; username: string; pin: string; role: string; branchId: string; perms: Perm[]; active: boolean }
export interface Warehouse { id: string; name: string; type: "فرع" | "مخزن"; location: string; manager: string }
export interface Transfer { id: string; no: number; date: string; from: string; to: string; fromName: string; toName: string; items: { productId: string; name: string; qty: number }[]; by: string; note: string }
export const MAIN_WH = "main";
export interface DB { employees: Employee[]; warehouses: Warehouse[]; transfers: Transfer[]; whStock: Record<string, Record<string, number>>; products: Product[]; customers: Customer[]; suppliers: Supplier[]; sales: Sale[]; purchases: Purchase[]; txs: Tx[]; settings: Settings; openingBalance: number }

export const GENERAL_CUSTOMER = "general";
const KEY = "omar-parts-erp-v1";
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function seed(): DB {
  const P = (partNo: string, oem: string, name: string, brand: string, models: string, category: Category, shelf: string, cost: number, price: number, stock: number, min: number): Product =>
    ({ id: partNo, partNo, oem, barcode: "880" + partNo.replace(/\D/g, "").padEnd(10, "7").slice(0, 10), name, brand, models, category, shelf, cost, price, stock, min });
  const products: Product[] = [
    P("26300-35505", "26300-35503", "فلتر زيت محرك", "Mobis", "أكسنت، إلنترا، سيراتو", "الفلاتر", "A-01", 4500, 7000, 85, 20),
    P("28113-2H000", "28113-2H100", "فلتر هواء", "Genuine", "إلنترا، سيراتو", "الفلاتر", "A-02", 9000, 14000, 32, 10),
    P("97133-2E210", "97133-2E200", "فلتر مكيف", "Mobis", "توسان، سبورتاج", "الفلاتر", "A-03", 6000, 10000, 4, 8),
    P("58101-2SA70", "58101-2SA00", "فحمات فرامل أمامية", "Mobis", "توسان، سبورتاج", "الفرامل", "B-01", 28000, 42000, 18, 6),
    P("58302-1RA30", "58302-1RA00", "فحمات فرامل خلفية", "Genuine", "أكسنت، ريو", "الفرامل", "B-02", 19000, 30000, 3, 6),
    P("51712-2S000", "51712-2S100", "طنبورة فرامل أمامية", "Mobis", "توسان، سبورتاج", "الفرامل", "B-03", 45000, 68000, 10, 4),
    P("54651-2S000", "54651-2S100", "مساعد أمامي يمين", "Mobis", "توسان IX35", "المساعدين والتعليق", "C-01", 85000, 125000, 6, 2),
    P("55311-1R000", "55311-1R100", "مساعد خلفي", "Genuine", "أكسنت 2012-2018", "المساعدين والتعليق", "C-02", 52000, 78000, 0, 2),
    P("54500-2S000", "54500-2S100", "مقص أمامي سفلي", "Mobis", "سبورتاج، توسان", "المساعدين والتعليق", "C-03", 60000, 92000, 7, 2),
    P("39180-2B000", "39180-2B010", "حساس كرنك", "Mobis", "أكسنت، i10، بيكانتو", "الكهرباء والحساسات", "D-01", 22000, 36000, 12, 4),
    P("39210-2B000", "39210-2B100", "حساس أكسجين", "Genuine", "إلنترا، سوناتا", "الكهرباء والحساسات", "D-02", 48000, 72000, 2, 3),
    P("27301-2B010", "27301-2B000", "بوبينة إشعال", "Mobis", "أكسنت، ريو، سيراتو", "الكهرباء والحساسات", "D-03", 26000, 40000, 24, 8),
    P("18855-10060", "18855-10061", "بوجي إيريديوم", "Genuine", "جميع الموديلات", "المحرك", "E-01", 7000, 11500, 120, 30),
    P("21421-2B000", "21421-2B100", "طرمبة زيت", "Mobis", "أكسنت، i20", "المحرك", "E-02", 65000, 98000, 5, 2),
    P("25100-2G500", "25100-2G000", "طرمبة ماء", "Mobis", "سوناتا، أوبتيما، توسان", "المحرك", "E-03", 42000, 65000, 9, 3),
    P("24312-2B000", "24312-2B100", "سير كاتينة", "Mobis", "أكسنت، سيراتو", "السيور", "F-01", 30000, 48000, 15, 5),
    P("25212-2G710", "25212-2G700", "سير دينمو (مروحة)", "Genuine", "سوناتا، توسان، سبورتاج", "السيور", "F-02", 14000, 22000, 1, 5),
    P("23129-2G000", "23129-2G100", "بكرة شداد سير", "Mobis", "توسان، سبورتاج", "السيور", "F-03", 21000, 34000, 11, 4),
  ];
  const customers: Customer[] = [
    { id: GENERAL_CUSTOMER, name: "زبون عام / عميل نقدي", phone: "", car: "-", debt: 0, points: 0 },
    { id: "c1", name: "ورشة الأمين للصيانة", phone: "0912345678", car: "توسان 2016", debt: 185000, points: 340 },
    { id: "c2", name: "محمد عثمان الطيب", phone: "0923456789", car: "أكسنت 2014", debt: 0, points: 120 },
    { id: "c3", name: "شركة النيل للنقل", phone: "0998765432", car: "سبورتاج 2018", debt: 420000, points: 610 },
    { id: "c4", name: "أحمد إبراهيم", phone: "0911122233", car: "إلنترا 2015", debt: 36000, points: 45 },
  ];
  const suppliers: Supplier[] = [
    { id: "s1", name: "حسن كوريا للاسبيرات", phone: "0915550001", company: "مؤسسة حسن التجارية", balance: 1250000 },
    { id: "s2", name: "مستودع الخليج", phone: "0925550002", company: "Gulf Parts Co.", balance: 640000 },
    { id: "s3", name: "وكالة موبيس دبي", phone: "+971501234567", company: "Mobis Dubai", balance: 0 },
  ];
  const sales: Sale[] = []; const txs: Tx[] = [];
  const now = Date.now(); let no = 1000;
  const custs = customers.slice(0, 5);
  for (let d = 20; d >= 0; d--) {
    const n = 1 + ((d * 7) % 4);
    for (let k = 0; k < n; k++) {
      const date = new Date(now - d * 864e5 - k * 3.1e6 - 3600e3).toISOString();
      const items: SaleItem[] = [0, 1].slice(0, 1 + ((d + k) % 2)).map((j) => {
        const p = products[(d * 3 + k * 5 + j * 7) % products.length];
        return { productId: p.id, name: p.name, partNo: p.partNo, price: p.price, cost: p.cost, qty: 1 + ((d + j) % 3) };
      });
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const discount = (d + k) % 5 === 0 ? 2000 : 0;
      const method: PayMethod = (["cash", "bankak", "cash", "credit"] as PayMethod[])[(d + k) % 4];
      const c = method === "credit" ? custs[1 + ((d + k) % 4)] : custs[(d + k) % 2 ? 0 : 2];
      const s: Sale = { id: uid(), no: ++no, date, customerId: c.id, customerName: c.name, items, subtotal, discount, total: subtotal - discount, method, cashier: "عمر عبدالله" };
      sales.push(s);
      if (method !== "credit") txs.push({ id: uid(), date, type: "مبيعات", dir: "in", amount: s.total, method, note: `فاتورة مبيعات #${s.no}` });
    }
    if (d % 6 === 0) txs.push({ id: uid(), date: new Date(now - d * 864e5 - 5e6).toISOString(), type: "مصروفات", dir: "out", amount: 15000 + d * 1000, method: "cash", note: "نثريات: شاي وترحيل" });
  }
  txs.push({ id: uid(), date: new Date(now - 12 * 864e5).toISOString(), type: "مصروفات", dir: "out", amount: 350000, method: "bankak", note: "إيجار: إيجار المحل الشهري" });
  txs.push({ id: uid(), date: new Date(now - 9 * 864e5).toISOString(), type: "سداد ديون", dir: "out", amount: 500000, method: "bankak", note: "سداد للمورد: مستودع الخليج" });
  txs.push({ id: uid(), date: new Date(now - 3 * 864e5).toISOString(), type: "تحصيل ديون", dir: "in", amount: 90000, method: "cash", note: "تحصيل من: ورشة الأمين للصيانة" });
  const purchases: Purchase[] = [{ id: uid(), no: 501, date: new Date(now - 10 * 864e5).toISOString(), supplierId: "s1", supplierName: "حسن كوريا للاسبيرات", items: [{ productId: products[0].id, name: products[0].name, qty: 50, cost: 4500 }], total: 225000 }];
  txs.push({ id: uid(), date: purchases[0].date, type: "مشتريات", dir: "out", amount: 225000, method: "cash", note: "فاتورة مشتريات #501 - حسن كوريا للاسبيرات" });
  txs.sort((a, b) => b.date.localeCompare(a.date)); sales.reverse();
  const employees: Employee[] = [
    { id: "e1", name: "عمر عبدالله", username: "admin", pin: "1234", role: "مدير عام", branchId: MAIN_WH, perms: [...ALL_PERMS], active: true },
    { id: "e2", name: "خالد الصادق", username: "cashier", pin: "1111", role: "كاشير", branchId: MAIN_WH, perms: ["pos", "sales", "customers"], active: true },
    { id: "e3", name: "يوسف حامد", username: "store", pin: "2222", role: "أمين مخزن", branchId: "w2", perms: ["inventory", "purchases", "branches", "transfers"], active: true },
  ];
  const warehouses: Warehouse[] = [
    { id: MAIN_WH, name: "الفرع الرئيسي - السوق العربي", type: "فرع", location: "الخرطوم - السوق العربي", manager: "عمر عبدالله" },
    { id: "w2", name: "مستودع بحري", type: "مخزن", location: "الخرطوم بحري - المنطقة الصناعية", manager: "يوسف حامد" },
    { id: "w3", name: "فرع أم درمان", type: "فرع", location: "أم درمان - سوق ليبيا", manager: "خالد الصادق" },
  ];
  const whStock: DB["whStock"] = {
    w2: Object.fromEntries(products.map((p, i) => [p.id, 10 + ((i * 7) % 25)])),
    w3: Object.fromEntries(products.slice(0, 8).map((p, i) => [p.id, 3 + i])),
  };
  return {
    employees, warehouses, transfers: [], whStock,
    products, customers, suppliers, sales, purchases, txs, openingBalance: 2500000,
    settings: { storeName: "مجموعة عمر عبد الله عبدالرحمن", subtitle: "لقطع غيار السيارات الكورية", phone: "0912000111", address: "الخرطوم - السوق العربي - شارع الحرية", currency: "ج.س", footer: "البضاعة المباعة ترد أو تستبدل خلال 3 أيام بالفاتورة وبحالتها الأصلية. الكهرباء لا ترد.", cashier: "عمر عبدالله", shiftStart: "08:00" },
  };
}

let state: DB = seed();
let loaded = false;
const listeners = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = { ...seed(), ...JSON.parse(raw) }; } catch { /* keep seed */ }
}
export function setDB(fn: (d: DB) => DB) {
  state = fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
  listeners.forEach((l) => l());
}
export function getDB() { load(); return state; }
export function resetDB() { setDB(() => seed()); }
export function useDB() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getDB, getDB);
}

// ---------- Domain actions ----------
export function computeTotals(items: { price: number; qty: number }[], discountValue: number, discountType: "amount" | "percent") {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const raw = discountType === "percent" ? (subtotal * Math.min(Math.max(discountValue, 0), 100)) / 100 : Math.max(discountValue, 0);
  const discount = Math.min(Math.round(raw), subtotal);
  return { subtotal, discount, total: subtotal - discount };
}

export function checkout(cart: { productId: string; qty: number }[], customerId: string, method: PayMethod, discountValue: number, discountType: "amount" | "percent"): Sale {
  const d = getDB();
  if (method === "credit" && customerId === GENERAL_CUSTOMER) throw new Error("البيع الآجل يتطلب اختيار عميل مسجل");
  const items: SaleItem[] = cart.map((c) => {
    const p = d.products.find((x) => x.id === c.productId);
    if (!p) throw new Error("صنف غير موجود");
    if (c.qty > p.stock) throw new Error(`الكمية غير متوفرة: ${p.name}`);
    return { productId: p.id, name: p.name, partNo: p.partNo, price: p.price, cost: p.cost, qty: c.qty };
  });
  if (!items.length) throw new Error("السلة فارغة");
  const t = computeTotals(items, discountValue, discountType);
  const cust = d.customers.find((c) => c.id === customerId)!;
  const no = Math.max(1000, ...d.sales.map((s) => s.no)) + 1;
  const sale: Sale = { id: uid(), no, date: new Date().toISOString(), customerId, customerName: cust.name, items, ...t, method, cashier: currentUser()?.name ?? d.settings.cashier };
  setDB((db) => ({
    ...db,
    products: db.products.map((p) => { const it = items.find((i) => i.productId === p.id); return it ? { ...p, stock: p.stock - it.qty } : p; }),
    customers: db.customers.map((c) => c.id === customerId && c.id !== GENERAL_CUSTOMER ? { ...c, debt: c.debt + (method === "credit" ? t.total : 0), points: c.points + Math.floor(t.total / 1000) } : c),
    sales: [sale, ...db.sales],
    txs: method === "credit" ? db.txs : [{ id: uid(), date: sale.date, type: "مبيعات", dir: "in", amount: t.total, method, note: `فاتورة مبيعات #${no}` }, ...db.txs],
  }));
  return sale;
}

export function returnSale(saleId: string) {
  const s = getDB().sales.find((x) => x.id === saleId);
  if (!s || s.returned) return;
  setDB((db) => ({
    ...db,
    sales: db.sales.map((x) => (x.id === saleId ? { ...x, returned: true } : x)),
    products: db.products.map((p) => { const it = s.items.find((i) => i.productId === p.id); return it ? { ...p, stock: p.stock + it.qty } : p; }),
    customers: db.customers.map((c) => c.id === s.customerId && s.method === "credit" ? { ...c, debt: Math.max(0, c.debt - s.total) } : c),
    txs: s.method === "credit" ? db.txs : [{ id: uid(), date: new Date().toISOString(), type: "مرتجعات", dir: "out", amount: s.total, method: s.method, note: `مرتجع فاتورة #${s.no}` }, ...db.txs],
  }));
}

export function savePurchase(supplierId: string, items: { productId: string; qty: number; cost: number }[], paidNow: boolean) {
  const d = getDB();
  const sup = d.suppliers.find((s) => s.id === supplierId);
  if (!sup) throw new Error("اختر المورد");
  const valid = items.filter((i) => i.qty > 0);
  if (!valid.length) throw new Error("أضف أصنافاً للفاتورة");
  const total = valid.reduce((s, i) => s + i.qty * i.cost, 0);
  const no = Math.max(500, ...d.purchases.map((p) => p.no)) + 1;
  const pur: Purchase = { id: uid(), no, date: new Date().toISOString(), supplierId, supplierName: sup.name, items: valid.map((i) => ({ ...i, name: d.products.find((p) => p.id === i.productId)?.name ?? "" })), total };
  setDB((db) => ({
    ...db,
    purchases: [pur, ...db.purchases],
    products: db.products.map((p) => { const it = valid.find((i) => i.productId === p.id); return it ? { ...p, stock: p.stock + it.qty, cost: it.cost } : p; }),
    suppliers: paidNow ? db.suppliers : db.suppliers.map((s) => (s.id === supplierId ? { ...s, balance: s.balance + total } : s)),
    txs: paidNow ? [{ id: uid(), date: pur.date, type: "مشتريات", dir: "out", amount: total, method: "cash", note: `فاتورة مشتريات #${no} - ${sup.name}` }, ...db.txs] : db.txs,
  }));
  return pur;
}

export function paySupplier(id: string, amount: number, method: "cash" | "bankak") {
  const s = getDB().suppliers.find((x) => x.id === id)!;
  setDB((db) => ({ ...db, suppliers: db.suppliers.map((x) => (x.id === id ? { ...x, balance: Math.max(0, x.balance - amount) } : x)), txs: [{ id: uid(), date: new Date().toISOString(), type: "سداد ديون", dir: "out", amount, method, note: `سداد للمورد: ${s.name}` }, ...db.txs] }));
}
export function collectDebt(id: string, amount: number, method: "cash" | "bankak") {
  const c = getDB().customers.find((x) => x.id === id)!;
  setDB((db) => ({ ...db, customers: db.customers.map((x) => (x.id === id ? { ...x, debt: Math.max(0, x.debt - amount) } : x)), txs: [{ id: uid(), date: new Date().toISOString(), type: "تحصيل ديون", dir: "in", amount, method, note: `تحصيل من: ${c.name}` }, ...db.txs] }));
}
export function addExpense(category: string, amount: number, method: "cash" | "bankak", note: string) {
  setDB((db) => ({ ...db, txs: [{ id: uid(), date: new Date().toISOString(), type: "مصروفات", dir: "out", amount, method, note: `${category}: ${note || category}` }, ...db.txs] }));
}

export function treasury(db: DB) {
  const sum = (f: (t: Tx) => boolean) => db.txs.filter(f).reduce((s, t) => s + t.amount, 0);
  const inAll = sum((t) => t.dir === "in"), outAll = sum((t) => t.dir === "out");
  const cashIn = sum((t) => t.dir === "in" && t.method === "cash"), cashOut = sum((t) => t.dir === "out" && t.method === "cash");
  return {
    balance: db.openingBalance + inAll - outAll,
    cashSales: sum((t) => t.type === "مبيعات" && t.method === "cash"),
    bankakSales: sum((t) => t.type === "مبيعات" && t.method === "bankak"),
    purchases: sum((t) => t.type === "مشتريات") + sum((t) => t.type === "سداد ديون"),
    expenses: sum((t) => t.type === "مصروفات"),
    cashInHand: db.openingBalance + cashIn - cashOut,
  };
}

// ---------- Warehouses & transfers ----------
export function whQty(db: DB, productId: string, wh: string) {
  if (wh === MAIN_WH) return db.products.find((p) => p.id === productId)?.stock ?? 0;
  return db.whStock[wh]?.[productId] ?? 0;
}
export function transferStock(from: string, to: string, items: { productId: string; qty: number }[], note = ""): Transfer {
  const d = getDB();
  if (!from || !to || from === to) throw new Error("اختر مخزنين مختلفين");
  const valid = items.filter((i) => i.qty > 0);
  if (!valid.length) throw new Error("أضف أصنافاً للتحويل");
  for (const i of valid) if (i.qty > whQty(d, i.productId, from)) throw new Error(`الكمية غير متوفرة بالمخزن المصدر: ${d.products.find((p) => p.id === i.productId)?.name}`);
  const name = (id: string) => d.warehouses.find((w) => w.id === id)?.name ?? id;
  const no = Math.max(100, ...d.transfers.map((t) => t.no)) + 1;
  const tr: Transfer = { id: uid(), no, date: new Date().toISOString(), from, to, fromName: name(from), toName: name(to), items: valid.map((i) => ({ ...i, name: d.products.find((p) => p.id === i.productId)?.name ?? "" })), by: currentUser()?.name ?? "-", note };
  setDB((db) => {
    const ws = { ...db.whStock };
    let products = db.products;
    const apply = (wh: string, pid: string, delta: number) => {
      if (wh === MAIN_WH) products = products.map((p) => (p.id === pid ? { ...p, stock: p.stock + delta } : p));
      else ws[wh] = { ...(ws[wh] ?? {}), [pid]: (ws[wh]?.[pid] ?? 0) + delta };
    };
    for (const i of valid) { apply(from, i.productId, -i.qty); apply(to, i.productId, i.qty); }
    return { ...db, products, whStock: ws, transfers: [tr, ...db.transfers] };
  });
  return tr;
}

// ---------- Session (login) ----------
const SKEY = "omar-parts-session";
let sessionId: string | null | undefined;
const sListeners = new Set<() => void>();
function getSessionId() {
  if (sessionId === undefined) sessionId = typeof window === "undefined" ? null : localStorage.getItem(SKEY);
  return sessionId;
}
function setSession(id: string | null) {
  sessionId = id;
  try { if (id) localStorage.setItem(SKEY, id); else localStorage.removeItem(SKEY); } catch { /* ignore */ }
  sListeners.forEach((l) => l());
}
export function currentUser(): Employee | null {
  const id = getSessionId();
  const e = id ? getDB().employees.find((x) => x.id === id) : undefined;
  return e && e.active ? e : null;
}
export function useCurrentUser() {
  useDB();
  useSyncExternalStore((l) => { sListeners.add(l); return () => sListeners.delete(l); }, getSessionId, () => null);
  return currentUser();
}
export function login(username: string, pin: string): Employee {
  const e = getDB().employees.find((x) => x.username.trim().toLowerCase() === username.trim().toLowerCase());
  if (!e || e.pin !== pin) throw new Error("اسم المستخدم أو الرمز غير صحيح");
  if (!e.active) throw new Error("هذا الحساب موقوف");
  setSession(e.id);
  return e;
}
export function logout() { setSession(null); }
export const can = (e: Employee | null, p: Perm) => !!e?.perms.includes(p);
export function permForPath(path: string): Perm | undefined {
  return PERMS.find((p) => p.to === path)?.key;
}
