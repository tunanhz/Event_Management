"use client"

import { useState } from "react"
import { CheckCircle2, FileText, Flag } from "lucide-react"
import { cn, formatDateTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  CONTRACT_REVIEWS_SEED,
  CONTRACT_STATUS_LABELS,
  type ContractReviewItem,
  type ContractReviewStatus,
} from "./finance-data"

const STATUS_VARIANT: Record<ContractReviewStatus, "warning" | "success" | "destructive"> = {
  awaiting_review: "warning",
  compliant: "success",
  flagged: "destructive",
}

/**
 * Contract review console: audit uploaded contracts/liquidation minutes after
 * an event completes. "Đạt chuẩn" unblocks payout; "Cần làm rõ" asks the
 * organizer for corrections. Local mock state.
 */
export function ContractReviewTable() {
  const [items, setItems] = useState<ContractReviewItem[]>(CONTRACT_REVIEWS_SEED)
  const [flaggingId, setFlaggingId] = useState<string | null>(null)
  const [flagNote, setFlagNote] = useState("")

  const setStatus = (id: string, status: ContractReviewStatus, note?: string) =>
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status, note: note ?? c.note } : c)))

  const confirmFlag = (id: string) => {
    if (!flagNote.trim()) return
    setStatus(id, "flagged", flagNote.trim())
    setFlaggingId(null)
    setFlagNote("")
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id} className="space-y-3 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{item.eventTitle}</p>
                <Badge variant={STATUS_VARIANT[item.status]}>
                  {CONTRACT_STATUS_LABELS[item.status]}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.organizer} · Nộp lúc {formatDateTime(item.uploadedAt)}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 flex-shrink-0 text-cyan-500" />
                <span className="truncate">{item.documentName}</span>
              </p>
              {item.note && (
                <p className="mt-1.5 text-xs italic text-muted-foreground">Ghi chú: {item.note}</p>
              )}
            </div>

            {item.status === "awaiting_review" && (
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatus(item.id, "compliant", "Đã đối soát — số liệu khớp.")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Đạt chuẩn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFlaggingId((prev) => (prev === item.id ? null : item.id))
                    setFlagNote("")
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/60 px-3.5 py-2 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-500/10 cursor-pointer dark:text-amber-400"
                >
                  <Flag className="h-4 w-4" />
                  Cần làm rõ
                </button>
              </div>
            )}
          </div>

          {flaggingId === item.id && (
            <div className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-3">
              <label htmlFor={`flag-${item.id}`} className="text-xs font-semibold text-foreground">
                Nội dung cần Ban tổ chức làm rõ <span className="text-rose-500">*</span>
              </label>
              <textarea
                id={`flag-${item.id}`}
                rows={2}
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="VD: Thiếu phụ lục bảng kê thiết bị — vui lòng bổ sung."
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-amber-500"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFlaggingId(null)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!flagNote.trim()}
                  onClick={() => confirmFlag(item.id)}
                  className={cn(
                    "rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer",
                    !flagNote.trim() && "cursor-not-allowed opacity-50"
                  )}
                >
                  Gửi yêu cầu làm rõ
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
