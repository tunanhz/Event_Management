"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle, Ticket } from "lucide-react"

/**
 * Landing page after a VNPAY redirect — /thanh-toan/vnpay-return.
 * The backend already verified the signature and finalized the payment
 * server-side before issuing this redirect; this page only reads the
 * `status`/`message` query params it was given to show the outcome. No
 * ticket-selection state needs to survive the round trip to VNPAY and back.
 */
export default function VnpayReturnPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <Suspense fallback={null}>
        <VnpayReturnResult />
      </Suspense>
    </div>
  )
}

function VnpayReturnResult() {
  const params = useSearchParams()
  const success = params.get("status") === "success"
  const message = params.get("message")

  return (
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
            ? "Vé của bạn đã được xác nhận và có thể xem trong mục “Vé của tôi”."
            : message || "Giao dịch VNPAY đã bị hủy hoặc thất bại. Vui lòng thử lại."}
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
        {success ? (
          <Link
            href="/ve-cua-toi"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
          >
            <Ticket className="h-4 w-4" />
            Xem vé của tôi
          </Link>
        ) : (
          <Link
            href="/su-kien"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
          >
            Quay lại danh sách sự kiện
          </Link>
        )}
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
