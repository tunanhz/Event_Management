"use client"

import { useEffect, useState } from "react"
import { Banknote, Undo2, X, Loader2 } from "lucide-react"
import { cn, formatDateTime, formatVnd } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  fetchPayouts,
  updatePayout,
  type PayoutRequest,
} from "@/lib/finance-api"

const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  executed: "Đã thực hiện",
  rejected: "Từ chối",
}

const STATUS_VARIANT: Record<string, "warning" | "success" | "destructive"> = {
  pending: "warning",
  executed: "success",
  rejected: "destructive",
}

/**
 * Payout/refund execution queue: disburse organizer revenue or refund
 * participants of cancelled events. Rejection requires a reason. Real database state.
 */
export function PayoutRefundTable() {
  const [requests, setRequests] = useState<PayoutRequest[]>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchPayouts()
      setRequests(data)
    } catch (err: any) {
      setError(err.message ?? "Không thể tải danh sách yêu cầu tài chính")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const executeAction = async (id: string, status: 'executed' | 'rejected', rejectionReason?: string) => {
    try {
      setError("")
      const updated = await updatePayout(id, { status, rejectionReason })
      setRequests((prev) =>
        prev?.map((r) =>
          r.id === id ? { ...r, status: updated.status, rejectionReason: updated.rejectionReason } : r
        )
      )
    } catch (err: any) {
      alert(err.message ?? "Thao tác phê duyệt tài chính thất bại")
    }
  }

  const confirmReject = async (id: string) => {
    if (!reason.trim()) return
    await executeAction(id, "rejected", reason.trim())
    setRejectingId(null)
    setReason("")
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-5 text-center text-sm text-destructive font-semibold">
        {error}
      </div>
    )
  }

  const list = requests ?? []

  return (
    <div className="divide-y divide-border">
      {list.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          Chưa có yêu cầu rút tiền hay hoàn tiền nào được gửi lên.
        </p>
      ) : (
        list.map((req) => (
          <div key={req.id} className="space-y-3 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={req.kind === "payout" ? "default" : "secondary"}>
                    {req.kind === "payout" ? "Payout" : "Refund"}
                  </Badge>
                  <p className="font-semibold text-foreground">{req.eventTitle}</p>
                  <Badge variant={STATUS_VARIANT[req.status] || "secondary"}>
                    {PAYOUT_STATUS_LABELS[req.status] || req.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {req.beneficiary} · {req.bankInfo} · Yêu cầu lúc {formatDateTime(req.requestedAt)}
                </p>
                <p className="mt-1 text-lg font-extrabold tabular-nums text-foreground">
                  {formatVnd(req.amount)}
                </p>
                {req.rejectionReason && (
                  <p className="mt-1 text-xs italic text-rose-500">Lý do từ chối: {req.rejectionReason}</p>
                )}
              </div>

              {req.status === "pending" && (
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => executeAction(req.id, "executed")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 cursor-pointer"
                  >
                    {req.kind === "payout" ? <Banknote className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                    {req.kind === "payout" ? "Giải ngân" : "Hoàn tiền"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId((prev) => (prev === req.id ? null : req.id))
                      setReason("")
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 px-3.5 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    Từ chối
                  </button>
                </div>
              )}
            </div>

            {rejectingId === req.id && (
              <div className="rounded-xl border border-rose-300/60 bg-rose-500/10 p-3">
                <label htmlFor={`reject-${req.id}`} className="text-xs font-semibold text-foreground">
                  Lý do từ chối <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id={`reject-${req.id}`}
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Tài khoản ngân hàng chưa xác minh — vui lòng xác minh trước khi rút."
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-rose-400"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectingId(null)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!reason.trim()}
                    onClick={() => confirmReject(req.id)}
                    className={cn(
                      "rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer",
                      !reason.trim() && "cursor-not-allowed opacity-50"
                    )}
                  >
                    Xác nhận từ chối
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
