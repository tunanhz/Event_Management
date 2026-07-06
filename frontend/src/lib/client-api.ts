/**
 * API Client for Client Components
 * Uses relative URLs that get proxied through Next.js rewrites
 */

const API_PREFIX = "/api";

interface ClientFetchOptions extends RequestInit {
  // Additional options for client-side fetching
}

class ClientApiClient {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private async request<T>(
    endpoint: string,
    options: ClientFetchOptions = {}
  ): Promise<T> {
    const url = `${this.prefix}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      credentials: options.credentials || "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `API Error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async get<T>(endpoint: string, options?: ClientFetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    body: unknown,
    options?: ClientFetchOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T>(
    endpoint: string,
    body: unknown,
    options?: ClientFetchOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, options?: ClientFetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

// Singleton instance for Client Components
export const clientApi = new ClientApiClient(API_PREFIX);
