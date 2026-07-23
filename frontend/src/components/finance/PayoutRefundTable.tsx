"use client"

import { useEffect, useState } from "react"
import {
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Loader2,
  MapPin,
  ShieldCheck,
  Ticket,
  Truck,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { cn, formatDateTime, formatVnd, formatNumber } from "@/lib/utils"
import {
  fetchPayouts,
  updatePayout,
  type PayoutRequest,
} from "@/lib/finance-api"

const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  executed: "Đã giải ngân",
  rejected: "Từ chối",
}

const STATUS_VARIANT: Record<string, "warning" | "success" | "destructive"> = {
  pending: "warning",
  executed: "success",
  rejected: "destructive",
}

export function PayoutRefundTable() {
  const [requests, setRequests] = useState<PayoutRequest[]>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedAudit, setSelectedAudit] = useState<PayoutRequest | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchPayouts()
      setRequests(data)
    } catch (err: any) {
      setError(err.message ?? "Không thể tải danh sách yêu cầu giải ngân")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const executeAction = async (id: string, status: "executed" | "rejected", rejectionReason?: string) => {
    setBusyId(id)
    try {
      setError("")
      const updated = await updatePayout(id, { status, rejectionReason })
      setRequests((prev) =>
        prev?.map((r) =>
          r.id === id ? { ...r, status: updated.status, rejectionReason: updated.rejectionReason } : r
        )
      )
      if (selectedAudit && selectedAudit.id === id) {
        setSelectedAudit((prev) => prev ? { ...prev, status: updated.status, rejectionReason: updated.rejectionReason } : null)
      }
      setRejectingId(null)
      setReason("")
    } catch (err: any) {
      alert(err.message ?? "Thao tác phê duyệt giải ngân thất bại")
    } finally {
      setBusyId(null)
    }
  }

  const confirmReject = async (id: string) => {
    if (!reason.trim()) return
    await executeAction(id, "rejected", reason.trim())
  }

  if (loading) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin opacity-70" />
        <p className="text-sm">Đang tải danh sách yêu cầu rút tiền...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-sm font-semibold text-destructive">
        {error}
      </div>
    )
  }

  const list = requests ?? []

  return (
    <div className="divide-y divide-border">
      {list.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground">
          <Banknote className="mx-auto h-10 w-10 opacity-30 mb-2" />
          <p className="text-sm">Chưa có yêu cầu rút tiền / giải ngân nào từ Ban tổ chức.</p>
        </div>
      ) : (
        list.map((req) => (
          <div key={req.id} className="space-y-3 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[req.status] || "secondary"}>
                    {PAYOUT_STATUS_LABELS[req.status] || req.status}
                  </Badge>
                  <h3 className="font-bold text-foreground text-base truncate">{req.eventTitle}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-cyan-600" />
                    BTC: <strong className="text-foreground">{req.organizer || req.beneficiary}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                    TK nhận: <span className="font-mono text-foreground">{req.bankInfo}</span>
                  </span>
                  <span>Gửi lúc: {formatDateTime(req.requestedAt)}</span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-muted-foreground">Số tiền yêu cầu rút:</span>
                  <span className="text-lg font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatVnd(req.amount)}
                  </span>
                </div>

                {req.rejectionReason && (
                  <p className="mt-1 text-xs italic text-rose-500">
                    Lý do từ chối: {req.rejectionReason}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAudit(req)}
                  className="border-cyan-500/30 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 cursor-pointer"
                >
                  <Eye className="mr-1.5 h-4 w-4" />
                  Xem chi tiết & Kiểm tra hợp đồng
                </Button>

                {req.status === "pending" && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => executeAction(req.id, "executed")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                    >
                      {busyId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                      Duyệt giải ngân
                    </button>
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => {
                        setRejectingId((prev) => (prev === req.id ? null : req.id))
                        setReason("")
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 px-3.5 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-50 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Inline Rejection Box */}
            {rejectingId === req.id && (
              <div className="mt-3 rounded-xl border border-rose-300/60 bg-rose-500/10 p-4 animate-fade-up">
                <label htmlFor={`reject-${req.id}`} className="text-xs font-semibold text-foreground">
                  Lý do từ chối yêu cầu giải ngân <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id={`reject-${req.id}`}
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Thông tin chủ tài khoản ngân hàng không khớp với tên trên hợp đồng ban đầu..."
                  className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-rose-500"
                />
                <div className="mt-2.5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectingId(null)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!reason.trim() || busyId === req.id}
                    onClick={() => confirmReject(req.id)}
                    className={cn(
                      "rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer",
                      (!reason.trim() || busyId === req.id) && "cursor-not-allowed opacity-50"
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

      {/* Perfectly Centered Audit Detail Modal */}
      {selectedAudit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedAudit(null)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-up my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600">
                  Hồ sơ đối soát & Yêu cầu giải ngân
                </span>
                <h3 className="text-xl font-bold text-foreground mt-1">{selectedAudit.eventTitle}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                  <span>Ban tổ chức: <strong>{selectedAudit.organizer || selectedAudit.beneficiary}</strong></span>
                  <span>•</span>
                  <span>Địa điểm: {selectedAudit.location}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Section 1: Ticket Sales & Revenue Overview */}
            <div className="my-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Ticket className="h-4 w-4 text-cyan-600" />
                1. Tình hình bán vé & Doanh thu thực tế
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                  <p className="text-xs text-muted-foreground">Tổng doanh thu vé thực thu</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatVnd(selectedAudit.totalRevenue || selectedAudit.amount)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                  <p className="text-xs text-muted-foreground">Số vé đã bán / Sức chứa</p>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {formatNumber(selectedAudit.ticketsSold || 0)} / {formatNumber(selectedAudit.capacity || 100)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                  <p className="text-xs text-muted-foreground">Số tiền yêu cầu giải ngân</p>
                  <p className="text-xl font-bold text-cyan-600 mt-1">
                    {formatVnd(selectedAudit.amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Section 2: Hợp đồng dịch vụ đã thuê, Tiền cọc & Thanh toán */}
            <div className="my-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-amber-500" />
                2. Dịch vụ hệ thống đã thuê & Chi phí đặt cọc / Thanh toán
              </h4>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Các dịch vụ thuê ngoài:</span>
                    <strong className="text-foreground text-sm">
                      {selectedAudit.logisticsServices && selectedAudit.logisticsServices.length > 0
                        ? selectedAudit.logisticsServices.join(", ")
                        : "Không thuê dịch vụ ngoài"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Tổng chi phí thuê dịch vụ:</span>
                    <strong className="text-foreground text-sm tabular-nums">
                      {formatVnd(selectedAudit.serviceCost || 0)}
                    </strong>
                  </div>
                </div>

                {(selectedAudit.serviceCost || 0) > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 text-xs border-t border-border pt-3">
                    <div>
                      <span className="text-muted-foreground block">Tiền cọc (20%):</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <strong className="text-foreground text-sm tabular-nums">
                          {formatVnd(selectedAudit.depositAmount || 0)}
                        </strong>
                        <Badge variant={selectedAudit.depositStatus === "PAID" ? "success" : "warning"}>
                          {selectedAudit.depositStatus === "PAID" ? "Đã cọc" : "Chưa cọc"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Thanh toán còn lại & Phát sinh:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <strong className="text-foreground text-sm tabular-nums">
                          {formatVnd((selectedAudit.finalPaymentAmount || 0) + (selectedAudit.additionalCost || 0))}
                        </strong>
                        <Badge variant={selectedAudit.finalPaymentStatus === "PAID" ? "success" : "secondary"}>
                          {selectedAudit.finalPaymentStatus === "PAID" ? "Đã thanh toán" : "Chờ quyết toán"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Section 3: Original Contract & Legal Documents */}
            <div className="my-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-cyan-600" />
                3. Hợp đồng dịch vụ ban đầu & Hồ sơ pháp lý
              </h4>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-cyan-600" />
                      Hợp đồng dịch vụ điện tử đã ký
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Người đại diện ký: <strong>{selectedAudit.contract?.repName || selectedAudit.organizer || "Người đại diện"}</strong>
                    </p>
                  </div>
                  {selectedAudit.contract?.signatureUrl ? (
                    <a
                      href={selectedAudit.contract.signatureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Xem file hợp đồng / Chữ ký PDF
                    </a>
                  ) : (
                    <Badge variant="secondary">Đã xác nhận ký điện tử</Badge>
                  )}
                </div>

                {selectedAudit.permitDocuments && selectedAudit.permitDocuments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Giấy phép biểu diễn đính kèm:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAudit.permitDocuments.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground hover:bg-muted"
                        >
                          <FileText className="h-3 w-3 text-cyan-600" />
                          {doc.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Section 4: Beneficiary Bank Info */}
            <div className="my-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-emerald-600" />
                4. Thông tin tài khoản ngân hàng thụ hưởng
              </h4>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                <div className="grid gap-2 sm:grid-cols-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Tên ngân hàng:</span>
                    <strong className="text-foreground">{selectedAudit.bankName || "MB Bank"}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Số tài khoản:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">{selectedAudit.accountNumber || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Chủ tài khoản:</span>
                    <strong className="text-foreground">{selectedAudit.accountHolder || selectedAudit.beneficiary}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between border-t border-border pt-4 gap-3">
              <Badge variant={STATUS_VARIANT[selectedAudit.status] || "secondary"}>
                Trạng thái: {PAYOUT_STATUS_LABELS[selectedAudit.status] || selectedAudit.status}
              </Badge>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setSelectedAudit(null)}>
                  Đóng
                </Button>
                {selectedAudit.status === "pending" && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === selectedAudit.id}
                      onClick={() => executeAction(selectedAudit.id, "executed")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                    >
                      {busyId === selectedAudit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                      Duyệt giải ngân
                    </button>
                    <button
                      type="button"
                      disabled={busyId === selectedAudit.id}
                      onClick={() => {
                        setRejectingId(selectedAudit.id)
                        setSelectedAudit(null)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-50 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
