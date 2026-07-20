"use client"

import { useEffect, useState } from "react"

/**
 * Official Vietnamese administrative units (post-2025 restructuring):
 * 34 provinces/cities, wards directly under each province (no district level).
 * Trimmed dataset lives in /public/data/vietnam-provinces-wards.json (~64KB)
 * and is fetched lazily on first use, then cached module-wide.
 */
export interface ProvinceWithWards {
  name: string
  wards: string[]
}

let cache: ProvinceWithWards[] | null = null
let inflight: Promise<ProvinceWithWards[]> | null = null

function loadDataset(): Promise<ProvinceWithWards[]> {
  if (cache) return Promise.resolve(cache)
  inflight ??= fetch("/data/vietnam-provinces-wards.json")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<ProvinceWithWards[]>
    })
    .then((data) => {
      if (!Array.isArray(data)) throw new Error("Dataset không hợp lệ")
      cache = data
      return data
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Province list + dependent ward lookup for the address selects. */
export function useVietnamAddressData() {
  const [provinces, setProvinces] = useState<ProvinceWithWards[]>(cache ?? [])
  const [error, setError] = useState(false)

  useEffect(() => {
    if (cache) return
    let alive = true
    loadDataset()
      .then((data) => alive && setProvinces(data))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

  return {
    loaded: provinces.length > 0,
    error,
    provinceNames: provinces.map((p) => p.name),
    getWardNames: (province: string): string[] =>
      provinces.find((p) => p.name === province)?.wards ?? [],
  }
}
