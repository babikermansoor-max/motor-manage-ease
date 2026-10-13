import { describe, expect, it, beforeEach } from "vitest";
import { can, getDB, login, logout, MAIN_WH, resetDB, transferStock, whQty } from "@/lib/store";

describe("staff & transfers", () => {
  beforeEach(() => { resetDB(); logout(); });
  it("login rejects wrong pin", () => { expect(() => login("admin", "0000")).toThrow(); });
  it("cashier cannot open treasury", () => { const e = login("cashier", "1111"); expect(can(e, "treasury")).toBe(false); expect(can(e, "pos")).toBe(true); });
  it("transfer moves qty between warehouses", () => {
    const p = getDB().products[0];
    const a = whQty(getDB(), p.id, "w2"), b = p.stock;
    transferStock("w2", MAIN_WH, [{ productId: p.id, qty: 5 }]);
    expect(whQty(getDB(), p.id, "w2")).toBe(a - 5);
    expect(whQty(getDB(), p.id, MAIN_WH)).toBe(b + 5);
  });
  it("transfer cannot exceed source stock", () => {
    const p = getDB().products[0];
    expect(() => transferStock("w2", MAIN_WH, [{ productId: p.id, qty: 9999 }])).toThrow();
  });
});
