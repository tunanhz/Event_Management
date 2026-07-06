"use client"

import { useEffect, useState } from "react"
import { clientApi } from "@/lib/client-api"

/** Category option loaded from GET /api/categories (BE requires categoryId). */
export interface CategoryOption {
  _id: string
  name: string
}

let cache: CategoryOption[] | null = null

/** Live category list for the wizard's "Thể loại sự kiện" select. */
export function useEventCategories(): CategoryOption[] {
  const [categories, setCategories] = useState<CategoryOption[]>(cache ?? [])

  useEffect(() => {
    if (cache) return
    let alive = true
    clientApi
      .get<{ data: CategoryOption[] }>("/categories")
      .then((res) => {
        cache = res.data ?? []
        if (alive) setCategories(cache)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return categories
}
