"use client"

import { useEffect, useState } from "react"

/**
 * Makes the VNPAY result pages tolerant of receiving the gateway's raw callback
 * directly (i.e. when `VNPAY_RETURN_URL` points at the frontend page instead of
 * the backend verify endpoint).
 *
 * VNPAY only verifies/finalizes a payment on the BACKEND route
 * `/api/payments/vnpay/return` (signature check + mark PAID / publish event).
 * The frontend result page can only *display* an outcome from a `status` query
 * param. So if the browser lands here still carrying VNPAY's `vnp_*` params
 * (notably `vnp_SecureHash`), forward the untouched query string to the backend
 * endpoint — it verifies, finalizes, then 307-redirects back to the correct
 * result page with `?status=success|failed`. The raw `window.location.search`
 * is reused verbatim so VNPAY's signed encoding is preserved exactly.
 *
 * Returns `true` while a redirect is in flight so the page can show a neutral
 * "verifying" state instead of briefly flashing a false "failed" card.
 */
export function useVnpayReturnProxy(): boolean {
  const [proxying, setProxying] = useState(false)

  useEffect(() => {
    const search = window.location.search
    // `vnp_SecureHash` is present only on VNPAY's own callback, never on our
    // own backend-issued redirect (which carries just `status`/`message`), so
    // this can't loop.
    if (search.includes("vnp_SecureHash")) {
      setProxying(true)
      window.location.replace(`/api/payments/vnpay/return${search}`)
    }
  }, [])

  return proxying
}
