"use client"

import { useEffect, useRef, useState } from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModerationDecisionModalProps {
  mode: "approve" | "reject"
  eventTitle: string
  onConfirm: (reason?: string) => void
  onClose: () => void
}

// Modal xác nhận Duyệt / Từ chối. Từ chối bắt buộc nhập lý do (theo quy tắc
// nghiệp vụ: organizer cần correction log để sửa hồ sơ và gửi lại).
export function ModerationDecisionModal({ mode, eventTitle, onConfirm, onClose }: ModerationDecisionModalProps) {
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isReject = mode === "reject"
  const reasonInvalid = isReject && reason.trim().length === 0

  useEffect(() => {
    if (isReject) textareaRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isReject, onClose])

  const handleConfirm = () => {
    setTouched(true)
    if (reasonInvalid) {
      textareaRef.current?.focus()
      return
    }
    onConfirm(isReject ? reason.trim() : undefined)
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isReject ? "Từ chối sự kiện" : "Duyệt sự kiện"}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-foreground">
          {isReject ? "Từ chối sự kiện" : "Duyệt & công bố sự kiện"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {isReject
            ? `Nhập lý do từ chối để Ban tổ chức chỉnh sửa hồ sơ “${eventTitle}”.`
            : `Sự kiện “${eventTitle}” sẽ được công bố lên trang công khai và gửi thông báo tới Ban tổ chức.`}
        </p>

        {isReject && (
          <div className="mt-4">
            <label htmlFor="reject-reason" className="text-sm font-semibold text-foreground">
              Lý do từ chối <span className="text-rose-500">*</span>
            </label>
            <textarea
              ref={textareaRef}
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="VD: Thiếu giấy phép biểu diễn do Sở VH-TT cấp — vui lòng bổ sung và gửi lại."
              className={cn(
                "mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-cyan-500",
                touched && reasonInvalid ? "border-rose-400" : "border-border"
              )}
            />
            {touched && reasonInvalid && (
              <p role="alert" className="mt-1 text-xs text-rose-500">
                Vui lòng nhập lý do từ chối — Ban tổ chức cần thông tin này để chỉnh sửa hồ sơ.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors cursor-pointer",
              isReject ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {isReject ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {isReject ? "Xác nhận từ chối" : "Xác nhận duyệt"}
          </button>
        </div>
      </div>
    </div>
  )
}
