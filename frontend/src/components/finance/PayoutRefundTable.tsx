"use client"

import { useState } from "react"
import { Banknote, Undo2, X } from "lucide-react"
import { cn, formatDateTime, formatVnd } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  PAYOUT_REQUESTS_SEED,
  PAYOUT_STATUS_LABELS,
  type PayoutRequest,
  type PayoutStatus,
} from "./finance-data"

const STATUS_VARIANT: Record<PayoutStatus, "warning" | "success" | "destructive"> = {
  pending: "warning",
  executed: "success",
  rejected: "destructive",
}

/**
 * Payout/refund execution queue: disburse organizer revenue or refund
 * participants of cancelled events. Rejection requires a reason. Mock state.
 */
export function PayoutRefundTable() {
  const [requests, setRequests] = useState<PayoutRequest[]>(PAYOUT_REQUESTS_SEED)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  const update = (id: string, patch: Partial<PayoutRequest>) =>
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const confirmReject = (id: string) => {
    if (!reason.trim()) return
    update(id, { status: "rejected", rejectionReason: reason.trim() })
    setRejectingId(null)
    setReason("")
  }

  return (
    <div className="divide-y divide-border">
      {requests.map((req) => (
        <div key={req.id} className="space-y-3 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={req.kind === "payout" ? "default" : "secondary"}>
                  {req.kind === "payout" ? "Payout" : "Refund"}
                </Badge>
                <p className="font-semibold text-foreground">{req.eventTitle}</p>
                <Badge variant={STATUS_VARIANT[req.status]}>{PAYOUT_STATUS_LABELS[req.status]}</Badge>
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
                  onClick={() => update(req.id, { status: "executed" })}
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
      ))}
    </div>
  )
}
