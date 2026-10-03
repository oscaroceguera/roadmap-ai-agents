import { describe, expect, it } from "vitest";
import { formatCents } from "./money";

describe("formatCents", () => {
  it("keeps the cents", () => expect(formatCents(1234)).toBe("$12.34"));
  it("pads single-digit cents", () => expect(formatCents(1205)).toBe("$12.05"));
  it("handles zero", () => expect(formatCents(0)).toBe("$0.00"));
});
