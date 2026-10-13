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
