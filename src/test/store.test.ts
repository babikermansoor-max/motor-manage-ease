import { describe, expect, it, beforeEach } from "vitest";
import { checkout, computeTotals, getDB, resetDB, returnSale, treasury } from "@/lib/store";

describe("POS rules", () => {
  beforeEach(() => resetDB());
  it("percent discount applies to subtotal", () => {
    expect(computeTotals([{ price: 10000, qty: 2 }], 10, "percent")).toEqual({ subtotal: 20000, discount: 2000, total: 18000 });
  });
  it("checkout decrements stock and adds cash to treasury", () => {
    const p = getDB().products[0];
    const before = treasury(getDB()).balance;
    const s = checkout([{ productId: p.id, qty: 2 }], "general", "cash", 0, "amount");
    expect(getDB().products[0].stock).toBe(p.stock - 2);
    expect(treasury(getDB()).balance).toBe(before + s.total);
  });
  it("credit sale requires registered customer and adds debt", () => {
    const p = getDB().products[0];
    expect(() => checkout([{ productId: p.id, qty: 1 }], "general", "credit", 0, "amount")).toThrow();
    const debt = getDB().customers.find((c) => c.id === "c2")!.debt;
    checkout([{ productId: p.id, qty: 1 }], "c2", "credit", 0, "amount");
    expect(getDB().customers.find((c) => c.id === "c2")!.debt).toBe(debt + p.price);
  });
  it("return restores stock and deducts treasury", () => {
    const p = getDB().products[0];
    const before = treasury(getDB()).balance;
    const s = checkout([{ productId: p.id, qty: 3 }], "general", "cash", 0, "amount");
    returnSale(s.id);
    expect(getDB().products[0].stock).toBe(p.stock);
    expect(treasury(getDB()).balance).toBe(before);
  });
});

import { applyOp, type Op } from "@/lib/ops";
describe("server-side operation rules", () => {
  beforeEach(() => resetDB());
  const sale = (id: string, productId: string): Op => ({ id, at: new Date().toISOString(), kind: "checkout", saleId: "s-" + id, cart: [{ productId, qty: 1 }], customerId: "general", method: "cash", discountValue: 0, discountType: "amount", cashier: "x" });
  it("two cashiers selling the last unit: second sale is rejected", () => {
    const db0 = getDB();
    const p = db0.products.find((x) => x.stock > 0)!;
    const db = { ...db0, products: db0.products.map((x) => (x.id === p.id ? { ...x, stock: 1 } : x)) };
    const after1 = applyOp(db, sale("a", p.id));
    expect(after1.products.find((x) => x.id === p.id)!.stock).toBe(0);
    expect(() => applyOp(after1, sale("b", p.id))).toThrow();
  });
  it("concurrent sales both keep their stock deduction", () => {
    const db = getDB(); const p = db.products.find((x) => x.stock >= 5)!;
    const out = applyOp(applyOp(db, sale("a", p.id)), sale("b", p.id));
    expect(out.products.find((x) => x.id === p.id)!.stock).toBe(p.stock - 2);
    expect(out.sales[0].no).toBe(out.sales[1].no + 1);
  });
  it("replaying the same sale does not deduct twice", () => {
    const db = getDB(); const p = db.products.find((x) => x.stock >= 5)!;
    const op = sale("a", p.id);
    const out = applyOp(applyOp(db, op), op);
    expect(out.products.find((x) => x.id === p.id)!.stock).toBe(p.stock - 1);
  });
});
