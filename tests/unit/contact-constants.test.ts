import { describe, expect, it } from "vitest";
import { FIXED_FAX, FIXED_PHONE, formatGroupedNumber } from "../../server/utils/contact-constants";

describe("server/utils/contact-constants", () => {
  it("exposes fixed bank phone and fax", () => {
    expect(FIXED_PHONE).toBe("675 878 034");
    expect(FIXED_FAX).toBe("222 221 785");
  });

  it("formatGroupedNumber strips non-digits and groups by 3", () => {
    expect(formatGroupedNumber("")).toBe("");
    expect(formatGroupedNumber(null)).toBe("");
    expect(formatGroupedNumber(undefined)).toBe("");
    expect(formatGroupedNumber("123456789")).toBe("123 456 789");
    expect(formatGroupedNumber("+237 690-12-34-56")).toBe("237 690 123 456");
  });
});
