import { api } from "@/lib/api";
import { clientApi } from "@/lib/client-api";

describe("API Clients", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Server API Client (api)", () => {
    it("should make a GET request with correct URL", async () => {
      const mockData = { id: "1", title: "Test" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.get("/events");

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/events"),
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual(mockData);
    });

    it("should use API_BASE_URL from environment or fallback", async () => {
      const mockData = { status: "ok" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await api.get("/test");

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      // Should start with http (fallback or env)
      expect(callUrl).toMatch(/^http/);
      expect(callUrl).toContain("/test");
    });

    it("should make a POST request with body", async () => {
      const payload = { title: "New Event" };
      const mockData = { id: "123", ...payload };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.post("/events", payload);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.method).toBe("POST");
      expect(options.body).toBe(JSON.stringify(payload));
      expect(options.headers).toHaveProperty("Content-Type", "application/json");
      expect(result).toEqual(mockData);
    });

    it("should make a PUT request with body", async () => {
      const payload = { title: "Updated Event" };
      const mockData = { id: "1", ...payload };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.put("/events/1", payload);

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.method).toBe("PUT");
      expect(options.body).toBe(JSON.stringify(payload));
      expect(result).toEqual(mockData);
    });

    it("should make a DELETE request", async () => {
      const mockData = { success: true };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.delete("/events/1");

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.method).toBe("DELETE");
      expect(result).toEqual(mockData);
    });

    it("should throw error on non-OK response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(api.get("/nonexistent")).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("404"),
        })
      );
    });

    it("should throw error on 500 server error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(api.post("/events", {})).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining("500"),
        })
      );
    });

    it("should throw error when fetch is rejected", async () => {
      const error = new Error("Network error");
      (global.fetch as jest.Mock).mockRejectedValueOnce(error);

      await expect(api.get("/events")).rejects.toBe(error);
    });

    it("should set Content-Type header automatically", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.get("/events");

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("should allow custom headers to override defaults", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.get("/events", {
        headers: { "X-Custom": "value" },
      });

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.headers["X-Custom"]).toBe("value");
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("should support cache and revalidate tags", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.get("/events", { tags: ["events"], revalidate: 3600 });

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.next).toBeDefined();
      expect(options.next.tags).toEqual(["events"]);
      expect(options.next.revalidate).toBe(3600);
    });

    it("should parse and return JSON response", async () => {
      const mockData = { data: [{ id: "1" }, { id: "2" }] };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.get("/events");

      expect(result).toEqual(mockData);
    });

    it("should handle empty response body", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const result = await api.get("/events");

      expect(result).toBeNull();
    });
  });

  describe("Client API Client (clientApi)", () => {
    it("should make a GET request with relative URL", async () => {
      const mockData = { id: "1", title: "Test" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await clientApi.get("/events");

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/events"),
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual(mockData);
    });

    it("should use /api prefix for all requests", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await clientApi.get("/events/123");

      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe("/api/events/123");
    });

    it("should make a POST request with body", async () => {
      const payload = { title: "New Event" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "123" }),
      });

      await clientApi.post("/events", payload);

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.method).toBe("POST");
      expect(options.body).toBe(JSON.stringify(payload));
    });

    it("should make a PUT request with body", async () => {
      const payload = { title: "Updated" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await clientApi.put("/events/1", payload);

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.method).toBe("PUT");
      expect(options.body).toBe(JSON.stringify(payload));
    });

    it("should make a PATCH request", async () => {
      const payload = { status: "published" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await clientApi.patch("/events/1", payload);

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.method).toBe("PATCH");
      expect(options.body).toBe(JSON.stringify(payload));
    });

    it("should make a DELETE request", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await clientApi.delete("/events/1");

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.method).toBe("DELETE");
    });

    it("should include credentials by default", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await clientApi.get("/events");

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.credentials).toBe("include");
    });

    it("should set Content-Type header", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await clientApi.get("/events");

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("should throw error on non-OK response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ message: "Invalid token" }),
      });

      await expect(clientApi.get("/events")).rejects.toThrow("Invalid token");
    });

    it("should use status message fallback when error message missing", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({}), // No error.message field
      });

      await expect(clientApi.get("/events")).rejects.toThrow(
        /API Error.*404/
      );
    });

    it("should handle JSON parse error on error response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(clientApi.get("/events")).rejects.toThrow(
        /API Error.*500/
      );
    });

    it("should throw error when fetch is rejected", async () => {
      const error = new Error("Network error");
      (global.fetch as jest.Mock).mockRejectedValueOnce(error);

      await expect(clientApi.get("/events")).rejects.toBe(error);
    });

    it("should allow custom headers", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await clientApi.get("/events", {
        headers: { "X-Custom-Header": "value" },
      });

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.headers["X-Custom-Header"]).toBe("value");
    });

    it("should allow overriding credentials", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await clientApi.get("/events", { credentials: "omit" });

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.credentials).toBe("omit");
    });

    it("should parse and return JSON response on success", async () => {
      const mockData = { events: [{ id: "1" }] };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await clientApi.post("/events", {});

      expect(result).toEqual(mockData);
    });

    it("should handle 400 bad request error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ message: "Validation failed" }),
      });

      await expect(clientApi.post("/events", {})).rejects.toThrow("Validation failed");
    });
  });

  describe("Comparison between api and clientApi", () => {
    it("api uses absolute backend URL, clientApi uses /api prefix", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.get("/events");
      const [serverUrl] = (global.fetch as jest.Mock).mock.calls[0];

      (global.fetch as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await clientApi.get("/events");
      const [clientUrl] = (global.fetch as jest.Mock).mock.calls[0];

      expect(serverUrl).toMatch(/^http/);
      expect(clientUrl).toBe("/api/events");
    });

    it("clientApi includes credentials, api may not", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.get("/events");
      const [, apiOpts] = (global.fetch as jest.Mock).mock.calls[0];

      (global.fetch as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await clientApi.get("/events");
      const [, clientOpts] = (global.fetch as jest.Mock).mock.calls[0];

      expect(clientOpts.credentials).toBe("include");
      // api doesn't explicitly set credentials in get
    });

    it("clientApi provides PATCH method, api does not", async () => {
      // clientApi should have patch method
      expect(typeof clientApi.patch).toBe("function");
      // api should not have patch method
      expect((api as any).patch).toBeUndefined();
    });
  });
});
