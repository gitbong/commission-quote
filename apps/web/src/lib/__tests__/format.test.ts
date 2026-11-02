import { formatCurrency, formatPercent } from "../format";

describe("format", () => {
  describe("GIVEN an amount", () => {
    describe("WHEN it is formatted as currency", () => {
      it("THEN it has a dollar sign, thousands separators and 2 decimals", () => {
        expect(formatCurrency(6875.5)).toBe("$6,875.50");
        expect(formatCurrency(0)).toBe("$0.00");
        expect(formatCurrency(1234567.891)).toBe("$1,234,567.89");
      });
    });
  });

  describe("GIVEN a fraction", () => {
    describe("WHEN it is formatted as a percent", () => {
      it("THEN it shows up to 2 decimals", () => {
        expect(formatPercent(0.0275)).toBe("2.75%");
        expect(formatPercent(0.03)).toBe("3%");
        expect(formatPercent(0.012345)).toBe("1.23%");
      });
    });
  });
});
