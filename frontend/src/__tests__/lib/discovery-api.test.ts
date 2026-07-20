import {
  fetchHomeData,
  fetchExploreEvents,
  fetchSearchEvents,
  fetchEventDetail,
} from "@/lib/discovery-api";

describe("Discovery API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockApiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  describe("fetchHomeData", () => {
    it("should fetch all home data sections in parallel", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await fetchHomeData();

      // Should make 5 requests: banners, stars, featured, trending, upcoming
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it("should fetch banners from correct endpoint", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await fetchHomeData();

      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls.some((c) => c[0].includes("/banners"))).toBe(true);
    });

    it("should fetch featured events", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await fetchHomeData();

      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(
        calls.some((c) => c[0].includes("collection=featured"))
      ).toBe(true);
    });

    it("should return mapped home data with all sections", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ _id: "b1", title: "Banner 1", imageUrl: "https://img.jpg" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ _id: "s1", name: "Star 1", slug: "star-1" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

      const result = await fetchHomeData();

      expect(result).toHaveProperty("banners");
      expect(result).toHaveProperty("stars");
      expect(result).toHaveProperty("featured");
      expect(result).toHaveProperty("trending");
      expect(result).toHaveProperty("upcoming");
      expect(result.banners).toHaveLength(1);
      expect(result.stars).toHaveLength(1);
    });

    it("should handle API failures gracefully with fallbacks", async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

      const result = await fetchHomeData();

      expect(result.banners).toEqual([]);
      expect(result.stars).toEqual([]);
    });

    it("should map banner data correctly", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                _id: "b1",
                title: "Festival 2026",
                subtitle: "Summer vibes",
                imageUrl: "https://example.com/banner.jpg",
                ctaLabel: "Book now",
                linkUrl: "/events/festival",
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

      const result = await fetchHomeData();

      expect(result.banners[0]).toEqual({
        id: "b1",
        title: "Festival 2026",
        subtitle: "Summer vibes",
        image: "https://example.com/banner.jpg",
        cta: "Book now",
        link: "/events/festival",
      });
    });

    it("should use default banner values when missing", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ _id: "b1", title: "Event" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

      const result = await fetchHomeData();

      expect(result.banners[0].cta).toBe("Khám phá ngay");
      expect(result.banners[0].link).toBe("#");
      expect(result.banners[0].image).toContain("placeholder");
    });
  });

  describe("fetchExploreEvents", () => {
    it("should fetch all events for explore page", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await fetchExploreEvents();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=100"),
        expect.anything()
      );
    });

    it("should return empty array on failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await fetchExploreEvents();

      expect(result).toEqual([]);
    });

    it("should map API event shape to ExploreEvent shape", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              _id: "e1",
              title: "Concert 2026",
              date: "2026-07-19",
              location: "Hanoi",
              priceFrom: 500000,
              isFeatured: true,
              isTrending: false,
              category: "Music",
            },
          ],
        }),
      });

      const result = await fetchExploreEvents();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("id", "e1");
      expect(result[0]).toHaveProperty("title", "Concert 2026");
      expect(result[0]).toHaveProperty("collections");
    });

    it("should include collection membership for featured events", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              _id: "e1",
              title: "Concert",
              isFeatured: true,
              isTrending: false,
            },
          ],
        }),
      });

      const result = await fetchExploreEvents();

      expect(result[0].collections).toContain("featured");
      expect(result[0].collections).toContain("upcoming");
      expect(result[0].collections).not.toContain("trending");
    });

    it("should handle non-OK response gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await fetchExploreEvents();

      expect(result).toEqual([]);
    });
  });

  describe("fetchSearchEvents", () => {
    it("should fetch events matching search query", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await fetchSearchEvents("concert");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/events/search?q=concert"),
        expect.anything()
      );
    });

    it("should encode search query properly", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await fetchSearchEvents("jazz night");

      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain("q=");
      expect(url).not.toContain(" "); // Space should be encoded
    });

    it("should return mapped explore events", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              _id: "e1",
              title: "Jazz Night",
              isFeatured: false,
              isTrending: true,
            },
          ],
        }),
      });

      const result = await fetchSearchEvents("jazz");

      expect(result).toHaveLength(1);
      expect(result[0].collections).toContain("trending");
    });

    it("should return empty array on failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await fetchSearchEvents("test");

      expect(result).toEqual([]);
    });

    it("should handle special characters in query", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await fetchSearchEvents("concert #2026");

      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain("q=");
      // URL should be properly encoded
      expect(url).not.toContain("#");
    });
  });

  describe("fetchEventDetail", () => {
    it("should fetch event detail by id", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            event: { _id: "e1", title: "Concert" },
            tickets: [],
            related: [],
          },
        }),
      });

      await fetchEventDetail("e1");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/events/e1/detail"),
        expect.anything()
      );
    });

    it("should return null if event not found", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: null }),
      });

      const result = await fetchEventDetail("nonexistent");

      expect(result).toBeNull();
    });

    it("should return null on API failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await fetchEventDetail("e1");

      expect(result).toBeNull();
    });

    it("should map event detail data correctly", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            event: {
              _id: "e1",
              title: "Summer Concert",
              date: "2026-07-19",
              startDate: "2026-07-19",
              organizer: "Org 1",
              organizerLogoUrl: "https://logo.jpg",
              organizerDescription: "Professional organizer",
            },
            tickets: [
              {
                _id: "t1",
                ticketName: "VIP",
                price: 500000,
                minPerOrder: 1,
                maxPerOrder: 10,
              },
            ],
            related: [
              {
                _id: "e2",
                title: "Other Concert",
              },
            ],
          },
        }),
      });

      const result = await fetchEventDetail("e1");

      expect(result).not.toBeNull();
      expect(result!.event.title).toBe("Summer Concert");
      expect(result!.tickets).toHaveLength(1);
      expect(result!.tickets[0].id).toBe("t1");
      expect(result!.organizer.name).toBe("Org 1");
      expect(result!.related).toHaveLength(1);
    });

    it("should format show dates correctly", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            event: {
              _id: "e1",
              title: "Event",
              sessions: [
                { date: "2026-07-19T10:00:00Z" },
                { date: "2026-07-20T10:00:00Z" },
              ],
            },
            tickets: [],
            related: [],
          },
        }),
      });

      const result = await fetchEventDetail("e1");

      expect(result).not.toBeNull();
      expect(result!.showDates).toHaveLength(2);
      expect(result!.showDates[0]).toMatch(/19/);
      expect(result!.showDates[1]).toMatch(/20/);
    });

    it("should map ticket data to expected shape", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            event: { _id: "e1", title: "Event" },
            tickets: [
              {
                _id: "t1",
                ticketName: "VIP",
                price: 1000000,
                minPerOrder: 1,
                maxPerOrder: 5,
                showId: "show-1",
              },
            ],
            related: [],
          },
        }),
      });

      const result = await fetchEventDetail("e1");

      const ticket = result!.tickets[0];
      expect(ticket.id).toBe("t1");
      expect(ticket.name).toBe("VIP");
      expect(ticket.price).toBe(1000000);
      expect(ticket.showId).toBe("show-1");
    });

    it("should map shows to show options correctly", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            event: {
              _id: "e1",
              title: "Event",
              shows: [
                {
                  _id: "s1",
                  title: "Matinee",
                  startTime: "2026-07-19T14:00:00Z",
                  endTime: "2026-07-19T17:00:00Z",
                },
                {
                  _id: "s2",
                  title: "Evening",
                  startTime: "2026-07-19T20:00:00Z",
                  endTime: "2026-07-19T23:00:00Z",
                },
              ],
            },
            tickets: [],
            related: [],
          },
        }),
      });

      const result = await fetchEventDetail("e1");

      expect(result!.shows).toHaveLength(2);
      expect(result!.shows[0].id).toBe("s1");
      expect(result!.shows[0].label).toBe("Matinee");
    });

    it("should auto-label shows when title is empty", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            event: {
              _id: "e1",
              title: "Event",
              shows: [
                {
                  _id: "s1",
                  title: "",
                  startTime: "2026-07-19T14:00:00Z",
                  endTime: "2026-07-19T17:00:00Z",
                },
                {
                  _id: "s2",
                  title: null,
                  startTime: "2026-07-19T20:00:00Z",
                  endTime: "2026-07-19T23:00:00Z",
                },
              ],
            },
            tickets: [],
            related: [],
          },
        }),
      });

      const result = await fetchEventDetail("e1");

      expect(result!.shows[0].label).toBe("Suất 1");
      expect(result!.shows[1].label).toBe("Suất 2");
    });

    it("should handle content blocks in description", async () => {
      const contentBlocks = [
        { type: "heading" as const, text: "Details" },
        { type: "paragraph" as const, text: "Description here" },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            event: {
              _id: "e1",
              title: "Event",
              contentBlocks,
            },
            tickets: [],
            related: [],
          },
        }),
      });

      const result = await fetchEventDetail("e1");

      expect(result!.description).toEqual(contentBlocks);
      expect(result!.descriptionHtml).toBeUndefined();
    });

    it("should use descriptionHtml when no content blocks", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            event: {
              _id: "e1",
              title: "Event",
              description: "<p>HTML description</p>",
              contentBlocks: [],
            },
            tickets: [],
            related: [],
          },
        }),
      });

      const result = await fetchEventDetail("e1");

      expect(result!.description).toEqual([]);
      expect(result!.descriptionHtml).toBe("<p>HTML description</p>");
    });
  });

  describe("Error handling and fallbacks", () => {
    it("should use cache no-store for all requests", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await fetchExploreEvents();

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.cache).toBe("no-store");
    });

    it("should use default images when imageUrl missing", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              _id: "e1",
              title: "Event",
              // No imageUrl or banner
            },
          ],
        }),
      });

      const result = await fetchExploreEvents();

      expect(result[0].image).toContain("placeholder");
    });

    it("should default organizer name when missing", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            event: { _id: "e1", title: "Event" },
            tickets: [],
            related: [],
          },
        }),
      });

      const result = await fetchEventDetail("e1");

      expect(result!.organizer.name).toBe("EventBox Organizer");
    });
  });
});
