import { useSyncExternalStore } from "react";
import { applyOp, computeTotals, diffPatch, GENERAL_CUSTOMER, MAIN_WH, uid, whQty, type Op, type OpBody } from "./ops";

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
export interface DB { employees: Employee[]; warehouses: Warehouse[]; transfers: Transfer[]; whStock: Record<string, Record<string, number>>; products: Product[]; customers: Customer[]; suppliers: Supplier[]; sales: Sale[]; purchases: Purchase[]; txs: Tx[]; settings: Settings; openingBalance: number }

const KEY = "omar-parts-erp-v1";

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
let confirmed: DB = state; // last state acknowledged by the server
let queue: Op[] = []; // operations not yet acknowledged
let loaded = false;
const listeners = new Set<() => void>();
const QKEY = KEY + "-queue", BKEY = KEY + "-base";
const isTest = () => import.meta.env.MODE === "test";
// sync: "unknown" until the server answers, "on" with DATABASE_URL, "off" for browser-only
let syncMode: "unknown" | "on" | "off" = "unknown";
let remoteVersion = 0, flushing = false, online = true, started = false;
let status = { mode: syncMode as string, online, pending: 0 };
const stListeners = new Set<() => void>();
function emitStatus() { status = { mode: syncMode, online, pending: queue.length }; stListeners.forEach((l) => l()); }

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY); if (raw) state = { ...seed(), ...JSON.parse(raw) };
    const b = localStorage.getItem(BKEY); confirmed = b ? { ...seed(), ...JSON.parse(b) } : state;
    const q = localStorage.getItem(QKEY); queue = q ? JSON.parse(q) : [];
  } catch { /* keep seed */ }
  if (isTest()) { syncMode = "off"; queue = []; }
  else setTimeout(startSync, 0);
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    localStorage.setItem(BKEY, JSON.stringify(confirmed));
    localStorage.setItem(QKEY, JSON.stringify(queue));
  } catch { /* quota */ }
  listeners.forEach((l) => l());
  emitStatus();
}
function rebase() {
  state = queue.reduce((d, op) => { try { return applyOp(d, op); } catch { return d; } }, confirmed);
}

// ---- Server sync (PostgreSQL via DATABASE_URL when self-hosted) ----
async function startSync() {
  try {
    const { pullState, pushState } = await import("./db-sync.functions");
    const r = await pullState();
    online = true;
    if (!r.enabled) { syncMode = "off"; confirmed = state; queue = []; persist(); return; }
    syncMode = "on";
    if (r.data) { remoteVersion = r.version; confirmed = { ...seed(), ...JSON.parse(r.data) }; rebase(); persist(); }
    else { // first device uploads its data
      const p = await pushState({ data: { data: JSON.stringify(confirmed) } }); remoteVersion = p.version;
      const again = await pullState(); if (again.data) { confirmed = { ...seed(), ...JSON.parse(again.data) }; remoteVersion = again.version; rebase(); persist(); }
    }
    void flush();
  } catch { online = false; emitStatus(); }
  finally {
    if (!started && syncMode !== "off") { started = true; setInterval(tick, 5000); }
  }
}
async function tick() {
  if (syncMode === "unknown") return startSync();
  if (syncMode !== "on" || flushing) return;
  if (queue.length) return flush();
  try {
    const { pullState } = await import("./db-sync.functions");
    const r = await pullState(); online = true;
    if (r.data && r.version > remoteVersion && !queue.length && !flushing) { remoteVersion = r.version; confirmed = { ...seed(), ...JSON.parse(r.data) }; rebase(); persist(); }
    else emitStatus();
  } catch { online = false; emitStatus(); }
}
async function flush() {
  if (syncMode !== "on" || flushing || !queue.length) return;
  flushing = true;
  const sent = queue.slice();
  try {
    const { applyOps } = await import("./db-sync.functions");
    const r = await applyOps({ data: { ops: sent } });
    online = true;
    if (r.data) { confirmed = { ...seed(), ...JSON.parse(r.data) }; remoteVersion = r.version; }
    const ids = new Set(sent.map((o) => o.id));
    queue = queue.filter((o) => !ids.has(o.id));
    const failed = (r.results as { id: string; ok: boolean; error?: string }[]).filter((x) => !x.ok);
    if (failed.length) {
      const { toast } = await import("sonner");
      failed.forEach((f) => toast.error(`رفض السيرفر العملية: ${f.error ?? "خطأ"}`, { duration: 8000 }));
    }
    rebase(); persist();
  } catch { online = false; emitStatus(); }
  finally { flushing = false; }
  if (queue.length && online) void flush();
}

/** Apply an operation locally right away and queue it for the server. Throws if it is invalid locally. */
export function dispatch(body: OpBody): DB {
  load();
  const op = { ...body, id: uid(), at: new Date().toISOString() } as Op;
  state = applyOp(state, op);
  if (syncMode === "off") confirmed = state; else queue.push(op);
  persist();
  void flush();
  return state;
}
export function setDB(fn: (d: DB) => DB) {
  load();
  const patch = diffPatch(state, fn(state));
  if (patch) dispatch({ kind: "patch", patch });
}
export function replaceDB(data: DB) { dispatch({ kind: "replace", data: { ...seed(), ...data } }); }
export function getDB() { load(); return state; }
export function resetDB() { replaceDB(seed()); }
export function useDB() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getDB, getDB);
}
const offStatus = { mode: "off", online: true, pending: 0 };
export function useSyncStatus() {
  return useSyncExternalStore((l) => { stListeners.add(l); return () => stListeners.delete(l); }, () => status, () => offStatus);
}

// ---------- Domain actions ----------
export { computeTotals, whQty, uid, GENERAL_CUSTOMER, MAIN_WH };

export function checkout(cart: { productId: string; qty: number }[], customerId: string, method: PayMethod, discountValue: number, discountType: "amount" | "percent"): Sale {
  const saleId = uid();
  const d = dispatch({ kind: "checkout", saleId, cart, customerId, method, discountValue, discountType, cashier: currentUser()?.name ?? getDB().settings.cashier });
  return d.sales.find((s) => s.id === saleId)!;
}
export function returnSale(saleId: string) {
  const s = getDB().sales.find((x) => x.id === saleId);
  if (!s || s.returned) return;
  dispatch({ kind: "returnSale", saleId });
}
export function savePurchase(supplierId: string, items: { productId: string; qty: number; cost: number }[], paidNow: boolean) {
  const purchaseId = uid();
  return dispatch({ kind: "purchase", purchaseId, supplierId, items, paidNow }).purchases.find((p) => p.id === purchaseId)!;
}
export function paySupplier(supplierId: string, amount: number, method: "cash" | "bankak") { dispatch({ kind: "paySupplier", supplierId, amount, method }); }
export function collectDebt(customerId: string, amount: number, method: "cash" | "bankak") { dispatch({ kind: "collectDebt", customerId, amount, method }); }
export function addExpense(category: string, amount: number, method: "cash" | "bankak", note: string) { dispatch({ kind: "expense", category, amount, method, note }); }

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
export function transferStock(from: string, to: string, items: { productId: string; qty: number }[], note = ""): Transfer {
  const transferId = uid();
  return dispatch({ kind: "transfer", transferId, from, to, items, note, by: currentUser()?.name ?? "-" }).transfers.find((t) => t.id === transferId)!;
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
