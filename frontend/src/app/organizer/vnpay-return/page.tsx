"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { useOrganizerTitle } from "@/components/organizer/OrganizerShellContext"
import { useVnpayReturnProxy } from "@/lib/use-vnpay-return-proxy"

/**
 * Landing page after a VNPAY redirect for an organizer deposit / remaining-balance
 * payment — /organizer/vnpay-return. Mirrors /thanh-toan/vnpay-return: the backend
 * already verified the signature and finalized depositStatus/finalPaymentStatus
 * server-side before issuing this redirect, so this page only reads the
 * `status`/`message` query params it was given to show the outcome.
 */
export default function OrganizerVnpayReturnPage() {
  useOrganizerTitle("Kết quả thanh toán")
  return (
    <Suspense fallback={null}>
      <OrganizerVnpayReturnResult />
    </Suspense>
  )
}

function OrganizerVnpayReturnResult() {
  const params = useSearchParams()
  const proxying = useVnpayReturnProxy()
  const success = params.get("status") === "success"
  const message = params.get("message")

  // Still carrying VNPAY's callback params — the proxy hook is redirecting to the
  // backend verify endpoint; show a neutral state instead of a false "failed".
  if (proxying) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-cyan-600" />
          <p className="text-sm text-muted-foreground">Đang xác nhận thanh toán VNPAY…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            success ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
          }`}
        >
          {success ? <CheckCircle2 className="h-9 w-9" /> : <XCircle className="h-9 w-9" />}
        </span>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">
            {success ? "Thanh toán thành công" : "Thanh toán không thành công"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {success
              ? "Giao dịch VNPAY đã hoàn tất. Trạng thái sự kiện đã được cập nhật trong mục \"Sự kiện của tôi\"."
              : message || "Giao dịch VNPAY đã bị hủy hoặc thất bại. Vui lòng thử lại."}
          </p>
        </div>

        <Link
          href="/organizer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
        >
          Về Sự kiện của tôi
        </Link>
      </div>
    </div>
  )
}
