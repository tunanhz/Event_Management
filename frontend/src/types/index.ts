/**
 * Shared TypeScript types for the frontend
 * These mirror the backend models
 */

// ─── Event Types ───────────────────────────────────────────
export interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  maxAttendees: number;
  organizer: string;
  category: string;
  status: "draft" | "published" | "cancelled" | "completed";
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── User Types ────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  role: "user" | "organizer" | "admin";
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API Response Types ────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// ─── Query Types ───────────────────────────────────────────
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface EventFilterParams extends PaginationParams {
  status?: string;
  category?: string;
}
