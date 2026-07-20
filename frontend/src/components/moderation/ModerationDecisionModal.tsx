"use client"

import { useEffect, useRef, useState } from "react"
import { Check, X, DollarSign } from "lucide-react"
import { cn, formatVnd } from "@/lib/utils"

interface ModerationDecisionModalProps {
  mode: "approve" | "reject"
  eventTitle: string
  /** Logistics services the organizer requested — shown in approve mode. */
  logisticsServices?: string[]
  onConfirm: (reason?: string, serviceCost?: number) => void
  onClose: () => void
}

const SERVICE_LABELS: Record<string, string> = {
  "tron-goi": "Dịch vụ trọn gói",
  "san-khau": "Sân khấu",
  "am-thanh": "Âm thanh",
  "anh-sang": "Ánh sáng",
  "ban-ghe": "Bàn ghế",
  "nhan-su": "Nhân sự",
}

function formatServiceLabel(s: string): string {
  if (SERVICE_LABELS[s]) return SERVICE_LABELS[s]
  // custom services start with "khac:" prefix from the wizard
  if (s.startsWith("khac:")) return s.slice(5).trim()
  return s
}

// Modal xác nhận Duyệt / Từ chối. Duyệt: nếu organizer có yêu cầu dịch vụ,
// admin nhập báo giá (serviceCost) → organizer phải cọc 20% trước khi publish.
// Từ chối: bắt buộc nhập lý do (organizer cần correction log để sửa hồ sơ).
export function ModerationDecisionModal({
  mode,
  eventTitle,
  logisticsServices = [],
  onConfirm,
  onClose,
}: ModerationDecisionModalProps) {
  const [reason, setReason] = useState("")
  const [serviceCostStr, setServiceCostStr] = useState("")
  const [touched, setTouched] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const costInputRef = useRef<HTMLInputElement>(null)
  const isReject = mode === "reject"
  const reasonInvalid = isReject && reason.trim().length === 0

  const hasServices = logisticsServices.length > 0
  const parsedCost = Number(serviceCostStr) || 0
  const costInvalid = !isReject && hasServices && parsedCost <= 0

  useEffect(() => {
    if (isReject) textareaRef.current?.focus()
    else if (hasServices) costInputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isReject, hasServices, onClose])

  const handleConfirm = () => {
    setTouched(true)
    if (reasonInvalid) {
      textareaRef.current?.focus()
      return
    }
    if (costInvalid) {
      costInputRef.current?.focus()
      return
    }
    onConfirm(
      isReject ? reason.trim() : undefined,
      !isReject && hasServices ? parsedCost : 0
    )
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
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-foreground">
          {isReject ? "Từ chối sự kiện" : "Duyệt sự kiện"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {isReject
            ? `Nhập lý do từ chối để Ban tổ chức chỉnh sửa hồ sơ "${eventTitle}".`
            : hasServices
              ? `Sự kiện "${eventTitle}" có yêu cầu dịch vụ. Nhập báo giá dịch vụ — Organizer phải cọc 20% trước khi sự kiện được công bố.`
              : `Sự kiện "${eventTitle}" sẽ được công bố lên trang công khai (không có dịch vụ thuê).`}
        </p>

        {/* Approve mode — show services + cost input */}
        {!isReject && hasServices && (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Dịch vụ yêu cầu:</p>
              <ul className="mt-1.5 space-y-1">
                {logisticsServices.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                    {formatServiceLabel(s)}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label htmlFor="service-cost" className="text-sm font-semibold text-foreground">
                Tổng chi phí dịch vụ (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <input
                  ref={costInputRef}
                  id="service-cost"
                  type="number"
                  min={0}
                  value={serviceCostStr}
                  onChange={(e) => setServiceCostStr(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="VD: 15000000"
                  className={cn(
                    "flex-1 rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-cyan-500",
                    touched && costInvalid ? "border-rose-400" : "border-border"
                  )}
                />
              </div>
              {parsedCost > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Organizer cọc 20%: <span className="font-semibold text-foreground">{formatVnd(Math.round(parsedCost * 0.2))}</span>
                  {" · "}Còn lại sau sự kiện: <span className="font-semibold text-foreground">{formatVnd(Math.round(parsedCost * 0.8))}</span>
                </p>
              )}
              {touched && costInvalid && (
                <p role="alert" className="mt-1 text-xs text-rose-500">
                  Vui lòng nhập báo giá dịch vụ — cần thiết để tính cọc 20%.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Reject mode — reason textarea */}
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
            {isReject ? "Xác nhận từ chối" : hasServices ? "Duyệt & gửi báo giá" : "Xác nhận duyệt"}
          </button>
        </div>
      </div>
    </div>
  )
}
