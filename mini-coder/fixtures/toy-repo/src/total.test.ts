import { expect, it } from "vitest";
import { cartTotal } from "./cart";
import { invoiceLine } from "./invoice";
import { receiptFooter } from "./receipt";

it("cart tax", () =>
  expect(cartTotal([{ priceCents: 1000, qty: 2 }]).tax).toBe(320));
it("invoice iva rounds", () => expect(invoiceLine(999).iva).toBe(160));
it("receipt tax", () => expect(receiptFooter(1000).taxCents).toBe(160));
