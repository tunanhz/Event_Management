import {
  parseQuantities,
  buildLines,
  totalAmount,
  totalQuantity,
  encodeSelection,
  type Quantities,
  type BookingLine,
} from "@/lib/booking-selection";
import type { TicketType } from "@/lib/mockData";

describe("Booking Selection", () => {
  // Minimal fixture tickets matching the real TicketType interface
  const tickets: TicketType[] = [
    { id: "standard", name: "Standard", price: 500000, minPerOrder: 1, maxPerOrder: 10 },
    { id: "vip", name: "VIP", price: 1000000, minPerOrder: 1, maxPerOrder: 5 },
    { id: "premium", name: "Premium", price: 2000000, minPerOrder: 1, maxPerOrder: 3 },
  ];

  describe("parseQuantities", () => {
    it("should parse valid string quantities into numbers", () => {
      const params = { standard: "2", vip: "1" };
      const result = parseQuantities(tickets, params);
      expect(result.standard).toBe(2);
      expect(result.vip).toBe(1);
      expect(result.premium).toBe(0);
    });

    it("should initialize missing tickets with 0", () => {
      const params = { standard: "3" };
      const result = parseQuantities(tickets, params);
      expect(result.standard).toBe(3);
      expect(result.vip).toBe(0);
      expect(result.premium).toBe(0);
    });

    it("should convert array values to first element", () => {
      const params = { standard: ["5", "999"], vip: ["2"] };
      const result = parseQuantities(tickets, params);
      expect(result.standard).toBe(5);
      expect(result.vip).toBe(2);
    });

    it("should convert 0 string to 0", () => {
      const params = { standard: "0", vip: "3" };
      const result = parseQuantities(tickets, params);
      expect(result.standard).toBe(0);
      expect(result.vip).toBe(3);
    });

    it("should convert negative strings to 0", () => {
      const params = { standard: "-5", vip: "2" };
      const result = parseQuantities(tickets, params);
      expect(result.standard).toBe(0);
      expect(result.vip).toBe(2);
    });

    it("should convert non-numeric strings to 0", () => {
      const params = { standard: "abc", vip: "2" };
      const result = parseQuantities(tickets, params);
      expect(result.standard).toBe(0);
      expect(result.vip).toBe(2);
    });

    it("should convert empty strings to 0", () => {
      const params = { standard: "", vip: "1" };
      const result = parseQuantities(tickets, params);
      expect(result.standard).toBe(0);
      expect(result.vip).toBe(1);
    });

    it("should handle undefined and null values", () => {
      const params = { standard: undefined, vip: null, premium: "2" };
      const result = parseQuantities(tickets, params as any);
      expect(result.standard).toBe(0);
      expect(result.vip).toBe(0);
      expect(result.premium).toBe(2);
    });

    it("should only include ids present in tickets array", () => {
      const params = { standard: "1", vip: "1", nonexistent: "999" };
      const result = parseQuantities(tickets, params as any);
      expect(Object.keys(result).sort()).toEqual(["premium", "standard", "vip"]);
      expect(result.nonexistent).toBeUndefined();
    });

    it("should handle empty search params", () => {
      const params = {};
      const result = parseQuantities(tickets, params);
      expect(result.standard).toBe(0);
      expect(result.vip).toBe(0);
      expect(result.premium).toBe(0);
    });

    it("should handle empty tickets array", () => {
      const params = { standard: "5" };
      const result = parseQuantities([], params as any);
      expect(Object.keys(result).length).toBe(0);
    });

    it("should convert decimal strings correctly", () => {
      const params = { standard: "2.5", vip: "3.9" };
      const result = parseQuantities(tickets, params);
      // parseInt truncates decimal
      expect(result.standard).toBe(2);
      expect(result.vip).toBe(3);
    });

    it("should preserve order of ticket ids", () => {
      const params = { standard: "1", vip: "2", premium: "3" };
      const result = parseQuantities(tickets, params);
      const keys = Object.keys(result);
      expect(keys[0]).toBe("standard");
      expect(keys[1]).toBe("vip");
      expect(keys[2]).toBe("premium");
    });
  });

  describe("buildLines", () => {
    it("should create booking lines with qty > 0", () => {
      const quantities: Quantities = { standard: 2, vip: 1, premium: 0 };
      const lines = buildLines(tickets, quantities);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toEqual({
        ticket: tickets[0],
        qty: 2,
        subtotal: 1000000, // 2 * 500000
      });
      expect(lines[1]).toEqual({
        ticket: tickets[1],
        qty: 1,
        subtotal: 1000000, // 1 * 1000000
      });
    });

    it("should drop lines with qty 0", () => {
      const quantities: Quantities = { standard: 0, vip: 0, premium: 0 };
      const lines = buildLines(tickets, quantities);
      expect(lines).toHaveLength(0);
    });

    it("should preserve ticket order", () => {
      const quantities: Quantities = { premium: 1, standard: 2, vip: 1 };
      const lines = buildLines(tickets, quantities);
      expect(lines[0].ticket.id).toBe("standard");
      expect(lines[1].ticket.id).toBe("vip");
      expect(lines[2].ticket.id).toBe("premium");
    });

    it("should handle missing quantity entry", () => {
      const quantities: Quantities = { standard: 1 };
      const lines = buildLines(tickets, quantities);
      expect(lines).toHaveLength(1);
      expect(lines[0].qty).toBe(1);
    });

    it("should calculate subtotal correctly for multiple items", () => {
      const quantities: Quantities = { standard: 10, vip: 5, premium: 2 };
      const lines = buildLines(tickets, quantities);
      expect(lines[0].subtotal).toBe(5000000); // 10 * 500000
      expect(lines[1].subtotal).toBe(5000000); // 5 * 1000000
      expect(lines[2].subtotal).toBe(4000000); // 2 * 2000000
    });

    it("should handle empty tickets array", () => {
      const quantities: Quantities = { standard: 5 };
      const lines = buildLines([], quantities);
      expect(lines).toHaveLength(0);
    });

    it("should handle empty quantities", () => {
      const quantities: Quantities = {};
      const lines = buildLines(tickets, quantities);
      expect(lines).toHaveLength(0);
    });

    it("should handle large quantities", () => {
      const quantities: Quantities = { standard: 1000, vip: 500 };
      const lines = buildLines(tickets, quantities);
      expect(lines[0].qty).toBe(1000);
      expect(lines[0].subtotal).toBe(500000000); // 1000 * 500000
      expect(lines[1].qty).toBe(500);
      expect(lines[1].subtotal).toBe(500000000); // 500 * 1000000
    });
  });

  describe("totalAmount", () => {
    it("should sum all subtotals", () => {
      const lines: BookingLine[] = [
        { ticket: tickets[0], qty: 2, subtotal: 1000000 },
        { ticket: tickets[1], qty: 1, subtotal: 1000000 },
        { ticket: tickets[2], qty: 1, subtotal: 2000000 },
      ];
      expect(totalAmount(lines)).toBe(4000000);
    });

    it("should return 0 for empty lines", () => {
      expect(totalAmount([])).toBe(0);
    });

    it("should handle single line", () => {
      const lines: BookingLine[] = [
        { ticket: tickets[0], qty: 5, subtotal: 2500000 },
      ];
      expect(totalAmount(lines)).toBe(2500000);
    });

    it("should handle large amounts", () => {
      const lines: BookingLine[] = [
        { ticket: tickets[2], qty: 100, subtotal: 200000000 },
        { ticket: tickets[1], qty: 200, subtotal: 200000000 },
      ];
      expect(totalAmount(lines)).toBe(400000000);
    });

    it("should accumulate correctly without losing precision", () => {
      const lines: BookingLine[] = [
        { ticket: tickets[0], qty: 3, subtotal: 1500000 },
        { ticket: tickets[1], qty: 7, subtotal: 7000000 },
        { ticket: tickets[2], qty: 2, subtotal: 4000000 },
      ];
      expect(totalAmount(lines)).toBe(12500000);
    });
  });

  describe("totalQuantity", () => {
    it("should sum all quantities", () => {
      const quantities: Quantities = { standard: 2, vip: 3, premium: 1 };
      expect(totalQuantity(quantities)).toBe(6);
    });

    it("should return 0 for empty quantities", () => {
      expect(totalQuantity({})).toBe(0);
    });

    it("should handle single quantity", () => {
      const quantities: Quantities = { standard: 5 };
      expect(totalQuantity(quantities)).toBe(5);
    });

    it("should ignore zero quantities", () => {
      const quantities: Quantities = { standard: 0, vip: 3, premium: 0 };
      expect(totalQuantity(quantities)).toBe(3);
    });

    it("should handle large quantities", () => {
      const quantities: Quantities = { standard: 1000, vip: 500, premium: 2000 };
      expect(totalQuantity(quantities)).toBe(3500);
    });
  });

  describe("encodeSelection", () => {
    it("should encode non-zero quantities as query params", () => {
      const quantities: Quantities = { standard: 2, vip: 1, premium: 0 };
      const encoded = encodeSelection(quantities);
      expect(encoded).toContain("standard=2");
      expect(encoded).toContain("vip=1");
      expect(encoded).not.toContain("premium");
    });

    it("should return empty string for all-zero quantities", () => {
      const quantities: Quantities = { standard: 0, vip: 0, premium: 0 };
      expect(encodeSelection(quantities)).toBe("");
    });

    it("should return empty string for empty quantities", () => {
      expect(encodeSelection({})).toBe("");
    });

    it("should handle single non-zero quantity", () => {
      const quantities: Quantities = { standard: 5, vip: 0 };
      const encoded = encodeSelection(quantities);
      expect(encoded).toBe("standard=5");
    });

    it("should handle all non-zero quantities", () => {
      const quantities: Quantities = { standard: 1, vip: 2, premium: 3 };
      const encoded = encodeSelection(quantities);
      expect(encoded).toContain("standard=1");
      expect(encoded).toContain("vip=2");
      expect(encoded).toContain("premium=3");
    });

    it("should be decodable with URLSearchParams", () => {
      const quantities: Quantities = { standard: 3, vip: 2 };
      const encoded = encodeSelection(quantities);
      const params = new URLSearchParams(encoded);
      expect(params.get("standard")).toBe("3");
      expect(params.get("vip")).toBe("2");
      expect(params.get("premium")).toBeNull();
    });

    it("should round-trip through parseQuantities", () => {
      const original: Quantities = { standard: 2, vip: 1, premium: 0 };
      const encoded = encodeSelection(original);
      const params = Object.fromEntries(new URLSearchParams(encoded));
      const parsed = parseQuantities(tickets, params);
      expect(parsed.standard).toBe(original.standard);
      expect(parsed.vip).toBe(original.vip);
      expect(parsed.premium).toBe(original.premium);
    });

    it("should handle large quantities in encoding", () => {
      const quantities: Quantities = { standard: 1000, vip: 500, premium: 0 };
      const encoded = encodeSelection(quantities);
      const params = new URLSearchParams(encoded);
      expect(params.get("standard")).toBe("1000");
      expect(params.get("vip")).toBe("500");
    });
  });
});
