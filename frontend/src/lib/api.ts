/**
 * API Client for Server Components (RSC)
 * Fetches data directly from Express backend during SSR
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

interface FetchOptions extends RequestInit {
  tags?: string[];
  revalidate?: number | false;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { tags, revalidate, ...fetchOptions } = options;

    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
      next: {
        ...(tags && { tags }),
        ...(revalidate !== undefined && { revalidate }),
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    body: unknown,
    options?: FetchOptions
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
    options?: FetchOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

// Singleton instance for Server Components
export const api = new ApiClient(API_BASE_URL);
