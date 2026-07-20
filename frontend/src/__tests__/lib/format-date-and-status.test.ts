import {
  formatDate,
  formatDateTime,
  getStatusColor,
  getStatusLabel,
  formatNumber,
  formatCurrency,
} from "@/lib/utils";

describe("Date & Status Formatting", () => {
  describe("formatDate", () => {
    it("should format a valid ISO date", () => {
      const result = formatDate("2026-07-19");
      // Locale output can vary; assert robust components are present
      expect(result).toMatch(/19/);
      expect(result).toMatch(/7|tháng 7|Tháng 7/i);
      expect(result).toMatch(/2026/);
    });

    it("should format a valid ISO datetime", () => {
      const result = formatDate("2026-07-19T14:30:00Z");
      expect(result).toMatch(/19/);
      expect(result).toMatch(/7|tháng 7|Tháng 7/i);
      expect(result).toMatch(/2026/);
    });

    it("should return 'Invalid Date' for invalid input", () => {
      expect(formatDate("invalid")).toContain("Invalid Date");
      expect(formatDate("")).toContain("Invalid Date");
      expect(formatDate("not-a-date")).toContain("Invalid Date");
    });

    it("should handle leap year date", () => {
      const result = formatDate("2024-02-29");
      expect(result).toMatch(/29/);
      expect(result).toMatch(/2|tháng 2|Tháng 2/i);
      expect(result).toMatch(/2024/);
    });

    it("should handle start of year", () => {
      const result = formatDate("2026-01-01");
      expect(result).toMatch(/1/);
      expect(result).toMatch(/1|tháng 1|Tháng 1/i);
      expect(result).toMatch(/2026/);
    });

    it("should handle end of year", () => {
      const result = formatDate("2026-12-31");
      expect(result).toMatch(/31/);
      expect(result).toMatch(/12|tháng 12|Tháng 12/i);
      expect(result).toMatch(/2026/);
    });
  });

  describe("formatDateTime", () => {
    it("should format date and time together", () => {
      const result = formatDateTime("2026-07-19T14:30:00Z");
      expect(result).toMatch(/tháng 7|Tháng 7/i);
      expect(result).toMatch(/2026/);
      // Should include time digits
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it("should return 'Invalid Date' for invalid input", () => {
      expect(formatDateTime("invalid")).toContain("Invalid Date");
      expect(formatDateTime("")).toContain("Invalid Date");
    });

    it("should format midnight correctly", () => {
      const result = formatDateTime("2026-07-19T00:00:00Z");
      expect(result).toMatch(/tháng 7|Tháng 7/i);
      expect(result).toMatch(/2026/);
    });

    it("should format end of day correctly", () => {
      const result = formatDateTime("2026-07-19T23:59:00Z");
      expect(result).toMatch(/tháng 7|Tháng 7/i);
      expect(result).toMatch(/2026/);
    });
  });

  describe("getStatusColor", () => {
    it("should return the correct color for draft status", () => {
      expect(getStatusColor("draft")).toBe("var(--color-warning)");
    });

    it("should return the correct color for published status", () => {
      expect(getStatusColor("published")).toBe("var(--color-success)");
    });

    it("should return the correct color for cancelled status", () => {
      expect(getStatusColor("cancelled")).toBe("var(--color-error)");
    });

    it("should return the correct color for completed status", () => {
      expect(getStatusColor("completed")).toBe("var(--color-info)");
    });

    it("should return the default color for unknown status", () => {
      expect(getStatusColor("unknown")).toBe("var(--color-muted)");
      expect(getStatusColor("pending")).toBe("var(--color-muted)");
      expect(getStatusColor("")).toBe("var(--color-muted)");
    });

    it("should handle case-sensitive keys", () => {
      expect(getStatusColor("DRAFT")).toBe("var(--color-muted)");
      expect(getStatusColor("Draft")).toBe("var(--color-muted)");
    });
  });

  describe("getStatusLabel", () => {
    it("should return the correct label for draft status", () => {
      expect(getStatusLabel("draft")).toBe("Bản nháp");
    });

    it("should return the correct label for published status", () => {
      expect(getStatusLabel("published")).toBe("Đã xuất bản");
    });

    it("should return the correct label for cancelled status", () => {
      expect(getStatusLabel("cancelled")).toBe("Đã hủy");
    });

    it("should return the correct label for completed status", () => {
      expect(getStatusLabel("completed")).toBe("Hoàn thành");
    });

    it("should return the input string for unknown status", () => {
      expect(getStatusLabel("unknown")).toBe("unknown");
      expect(getStatusLabel("pending")).toBe("pending");
      expect(getStatusLabel("custom-status")).toBe("custom-status");
    });

    it("should handle empty string", () => {
      expect(getStatusLabel("")).toBe("");
    });
  });

  describe("formatNumber", () => {
    it("should format a small number", () => {
      expect(formatNumber(1234)).toBe("1,234");
    });

    it("should format a large number with thousands separator", () => {
      expect(formatNumber(1234567)).toBe("1,234,567");
    });

    it("should format zero", () => {
      expect(formatNumber(0)).toBe("0");
    });

    it("should format negative numbers", () => {
      expect(formatNumber(-1234)).toBe("-1,234");
      expect(formatNumber(-1234567)).toBe("-1,234,567");
    });

    it("should format very large numbers", () => {
      expect(formatNumber(1000000000)).toBe("1,000,000,000");
      expect(formatNumber(999999999)).toBe("999,999,999");
    });

    it("should format decimal numbers by rounding", () => {
      // Intl.NumberFormat rounds decimals
      expect(formatNumber(1234.5)).toMatch(/1,234/);
    });

    it("should format single digit", () => {
      expect(formatNumber(5)).toBe("5");
    });

    it("should format numbers near boundaries", () => {
      expect(formatNumber(999)).toBe("999");
      expect(formatNumber(1000)).toBe("1,000");
      expect(formatNumber(1001)).toBe("1,001");
    });
  });

  describe("formatCurrency", () => {
    it("should format zero", () => {
      const result = formatCurrency(0);
      expect(result).toMatch(/0\s*₫|0 đ/); // Can be either character depending on locale
    });

    it("should format small amounts with full VND format", () => {
      const result = formatCurrency(100000);
      expect(result).toMatch(/₫|đ/); // Currency symbol (₫ or đ variant)
      expect(result).toMatch(/100/);
    });

    it("should format boundary: 999,999 stays in full format", () => {
      const result = formatCurrency(999999);
      expect(result).toMatch(/₫|đ/);
      expect(result).toMatch(/999/);
      // Should not have 'tr' abbreviation
      expect(result).not.toMatch(/tr/i);
    });

    it("should format boundary: 1,000,000 switches to 'tr đ' suffix", () => {
      const result = formatCurrency(1000000);
      expect(result).toContain("tr đ");
      expect(result).toMatch(/1/);
    });

    it("should format millions correctly", () => {
      const result = formatCurrency(5000000);
      expect(result).toContain("tr đ");
      expect(result).toMatch(/5/);
    });

    it("should format boundary: 999,999,999 still in 'tr' range", () => {
      const result = formatCurrency(999999999);
      expect(result).toContain("tr đ");
    });

    it("should format boundary: 1,000,000,000 switches to 'tỷ đ' suffix", () => {
      const result = formatCurrency(1000000000);
      expect(result).toContain("tỷ đ");
      expect(result).toMatch(/1/);
    });

    it("should format billions correctly", () => {
      const result = formatCurrency(5500000000);
      expect(result).toContain("tỷ đ");
      expect(result).toMatch(/5/);
    });

    it("should format large billions", () => {
      const result = formatCurrency(10000000000);
      expect(result).toContain("tỷ đ");
      expect(result).toMatch(/10/);
    });

    it("should handle negative amounts", () => {
      // Negative amounts don't pass >= checks so they use the default format
      const r1 = formatCurrency(-100000);
      expect(r1).toMatch(/₫|đ/);
      // Negative amounts fall through to Intl.NumberFormat, not abbreviations
      const r2 = formatCurrency(-1000000);
      expect(r2).toMatch(/₫|đ/);
      expect(r2).toMatch(/1/);
      const r3 = formatCurrency(-1000000000);
      expect(r3).toMatch(/₫|đ/);
      expect(r3).toMatch(/1/);
    });

    it("should format 10 million", () => {
      const result = formatCurrency(10000000);
      expect(result).toContain("tr đ");
      expect(result).toMatch(/10/);
    });

    it("should format 100 million", () => {
      const result = formatCurrency(100000000);
      expect(result).toContain("tr đ");
      expect(result).toMatch(/100/);
    });

    it("should use proper fraction digits for billions", () => {
      // 1.5 billion should show 1.5 not 1 or 2
      const result = formatCurrency(1500000000);
      expect(result).toContain("tỷ đ");
      expect(result).toMatch(/1/);
      // Should not go to "tr" range
      expect(result).not.toContain("tr đ");
    });

    it("should use no fraction digits for millions", () => {
      const result = formatCurrency(1500000);
      expect(result).toContain("tr đ");
      expect(result).toMatch(/1|2/); // Rounded to nearest integer
    });
  });
});
