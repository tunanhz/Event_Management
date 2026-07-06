/**
 * Admin CRUD for homepage content resources (categories, stars, banners).
 * Thin generic wrapper over the real backend endpoints — all ADMIN-only writes.
 */
import { clientApi } from "@/lib/client-api"

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

/** A record with a Mongo id (all resources share this). */
export interface WithId {
  _id: string
  [key: string]: unknown
}

export interface ResourceApi<T extends WithId> {
  list: () => Promise<T[]>
  create: (payload: Partial<T>) => Promise<T>
  update: (id: string, payload: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
}

/**
 * Build a CRUD client for a resource.
 * @param listPath  GET path for the admin list (e.g. "/categories", "/banners/admin")
 * @param basePath  base for write ops (e.g. "/categories" → POST /categories, PUT/DELETE /:id)
 */
function makeResourceApi<T extends WithId>(listPath: string, basePath: string): ResourceApi<T> {
  return {
    async list() {
      const res = await clientApi.get<ApiEnvelope<T[]>>(listPath)
      return res.data ?? []
    },
    async create(payload) {
      const res = await clientApi.post<ApiEnvelope<T>>(basePath, payload)
      return res.data
    },
    async update(id, payload) {
      const res = await clientApi.put<ApiEnvelope<T>>(`${basePath}/${id}`, payload)
      return res.data
    },
    async remove(id) {
      await clientApi.delete(`${basePath}/${id}`)
    },
  }
}

export interface Category extends WithId {
  name: string
  slug: string
  icon: string
  order: number
}

export interface Star extends WithId {
  name: string
  slug: string
  imageUrl: string
  verified: boolean
  order: number
}

export interface Banner extends WithId {
  title: string
  subtitle?: string
  imageUrl: string
  ctaLabel?: string
  linkUrl?: string
  order: number
  isActive: boolean
}

export const categoryApi = makeResourceApi<Category>("/categories", "/categories")
export const starApi = makeResourceApi<Star>("/stars", "/stars")
// Banners: /banners/admin returns all (incl. inactive) for management.
export const bannerApi = makeResourceApi<Banner>("/banners/admin", "/banners")
