"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  ShieldAlert,
  Loader2,
  MapPin,
  User,
  Clock,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { clientApi } from "@/lib/client-api"
import { Badge } from "@/components/ui/badge"
import { EventShowHeader } from "../shared/EventShowHeader"

interface StaffIncident {
  _id: string
  title: string
  description: string
  location: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  category: string
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  createdAt: string
  staffId?: {
    fullName?: string
    email?: string
    phone?: string
  }
}

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

const CATEGORY_LABELS: Record<string, string> = {
  security: "An ninh",
  crowd_control: "Ùn tắc / Đám đông",
  equipment: "Thiết bị / Kỹ thuật",
  medical: "Y tế",
  ticket_dispute: "Tranh chấp vé",
  other: "Khác",
}

const SEVERITY_BADGES: Record<string, { label: string; variant: "destructive" | "warning" | "secondary" | "outline" }> = {
  CRITICAL: { label: "Khẩn cấp 🚨", variant: "destructive" },
  HIGH: { label: "Cao", variant: "warning" },
  MEDIUM: { label: "Trung bình", variant: "secondary" },
  LOW: { label: "Thấp", variant: "outline" },
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "OPEN", label: "Đang chờ" },
  { value: "IN_PROGRESS", label: "Đang xử lý" },
  { value: "RESOLVED", label: "Đã xử lý" },
  { value: "CLOSED", label: "Đã đóng" },
]

export function OrganizerIncidentsView({ eventId }: { eventId: string }) {
  const [incidents, setIncidents] = useState<StaffIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const loadIncidents = () => {
    setLoading(true)
    clientApi
      .get<ApiEnvelope<StaffIncident[]>>(`/organizer/events/${eventId}/incidents`)
      .then((res) => setIncidents(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadIncidents()
  }, [eventId])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      await clientApi.patch<ApiEnvelope<StaffIncident>>(`/staff/incidents/${id}/status`, {
        status: newStatus,
      })
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === id ? { ...inc, status: newStatus as any } : inc))
      )
      const label = STATUS_OPTIONS.find((s) => s.value === newStatus)?.label || newStatus
      showToast(`Đã cập nhật trạng thái sang "${label}"`, true)
    } catch (err: any) {
      showToast(err.message || "Cập nhật thất bại", false)
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = incidents.filter((inc) => {
    const matchSev = filterSeverity === "ALL" || inc.severity === filterSeverity
    const matchSt = filterStatus === "ALL" || inc.status === filterStatus
    const matchQ =
      !searchQuery ||
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.staffId?.fullName && inc.staffId.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchSev && matchSt && matchQ
  })

  return (
    <>
      <EventShowHeader />

      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.ok ? "bg-emerald-600 text-white" : "bg-destructive text-destructive-foreground"
            }`}
          >
            {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Báo cáo sự cố từ Staff
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Theo dõi và phản hồi các sự cố / vấn đề do Nhân viên kiểm soát vé ghi nhận tại sự kiện.
            </p>
          </div>
          <button
            type="button"
            onClick={loadIncidents}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Làm mới
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, mô tả, vị trí hoặc tên staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="CRITICAL">Khẩn cấp 🚨</option>
            <option value="HIGH">Mức độ Cao</option>
            <option value="MEDIUM">Mức độ Trung bình</option>
            <option value="LOW">Mức độ Thấp</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="OPEN">Đang chờ</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="RESOLVED">Đã xử lý</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </div>

        {/* Table or Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
            Đang tải dữ liệu báo cáo sự cố...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
            <ShieldAlert className="mx-auto h-10 w-10 opacity-30 mb-3 text-emerald-500" />
            <p className="font-semibold text-foreground">Không tìm thấy báo cáo sự cố nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Staff báo cáo</th>
                  <th className="px-4 py-3">Tiêu đề &amp; Nội dung</th>
                  <th className="px-4 py-3">Loại sự cố</th>
                  <th className="px-4 py-3">Vị trí xảy ra</th>
                  <th className="px-4 py-3">Mức độ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inc) => {
                  const sev = SEVERITY_BADGES[inc.severity] || { label: inc.severity, variant: "secondary" }
                  const catLabel = CATEGORY_LABELS[inc.category] || inc.category || "Khác"
                  const staff = inc.staffId

                  return (
                    <tr key={inc._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                          {staff?.fullName || "Staff"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{staff?.email || "—"}</div>
                        {staff?.phone && <div className="text-xs text-muted-foreground">{staff.phone}</div>}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-bold text-foreground text-sm">{inc.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                          {inc.description}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex items-center text-xs text-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-lg border border-border">
                          {catLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex items-center gap-1 text-xs text-foreground font-medium bg-amber-500/10 text-amber-600 px-2 py-1 rounded-lg">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {inc.location}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <Badge variant={sev.variant}>{sev.label}</Badge>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {updatingId === inc._id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                        ) : (
                          <select
                            value={inc.status}
                            onChange={(e) => handleUpdateStatus(inc._id, e.target.value)}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-bold outline-none cursor-pointer transition-all ${
                              inc.status === "OPEN"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
                                : inc.status === "IN_PROGRESS"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20"
                                : inc.status === "RESOLVED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-slate-500/10 text-slate-400 border-slate-500/30 hover:bg-slate-500/20"
                            }`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-xs text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDateTime(inc.createdAt)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
