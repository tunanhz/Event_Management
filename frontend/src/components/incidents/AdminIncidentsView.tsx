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
  Calendar,
  ChevronDown,
} from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { clientApi } from "@/lib/client-api"
import { Badge } from "@/components/ui/badge"

interface PopulatedEvent {
  _id?: string
  title?: string
  startDate?: string
  date?: string
}

interface StaffIncident {
  _id: string
  eventId?: string | PopulatedEvent
  title: string
  description: string
  location: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  category: string
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  createdAt: string
  staffId?: {
    _id?: string
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

export function AdminIncidentsView() {
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
      .get<ApiEnvelope<StaffIncident[]>>("/staff/admin/incidents?limit=200")
      .then((res) => setIncidents(res.data ?? []))
      .catch((err) => showToast(err.message || "Không thể tải danh sách sự cố", false))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadIncidents()
  }, [])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      const res = await clientApi.patch<ApiEnvelope<StaffIncident>>(`/staff/incidents/${id}/status`, {
        status: newStatus,
      })
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === id ? { ...inc, status: newStatus as any } : inc))
      )
      const label = STATUS_OPTIONS.find((s) => s.value === newStatus)?.label || newStatus
      showToast(`Đã chuyển trạng thái sự cố sang "${label}"`, true)
    } catch (err: any) {
      showToast(err.message || "Cập nhật trạng thái thất bại", false)
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = incidents.filter((inc) => {
    const matchSev = filterSeverity === "ALL" || inc.severity === filterSeverity
    const matchSt = filterStatus === "ALL" || inc.status === filterStatus
    const eventTitle = typeof inc.eventId === "object" ? inc.eventId?.title ?? "" : ""
    const staffName = inc.staffId?.fullName ?? ""
    const matchQ =
      !searchQuery ||
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staffName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchSev && matchSt && matchQ
  })

  const openCount = incidents.filter((i) => i.status === "OPEN").length
  const inProgressCount = incidents.filter((i) => i.status === "IN_PROGRESS").length
  const resolvedCount = incidents.filter((i) => i.status === "RESOLVED").length

  return (
    <div className="space-y-6 animate-fade-up">
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

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Quản lý Báo cáo sự cố (System Admin)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi tất cả sự cố do Staff gửi từ các sự kiện và chuyển trạng thái xử lý.
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Tổng số sự cố</p>
          <p className="text-2xl font-extrabold text-foreground mt-1">{incidents.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs text-amber-600 font-medium">Đang chờ xử lý</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{openCount}</p>
        </div>
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
          <p className="text-xs text-blue-600 font-medium">Đang giải quyết</p>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">{inProgressCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-xs text-emerald-600 font-medium">Đã xử lý xong</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm sự kiện, tiêu đề, mô tả, vị trí hoặc staff..."
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

      {/* Main Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
          Đang tải danh sách sự cố toàn hệ thống...
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
                <th className="px-4 py-3">Sự kiện</th>
                <th className="px-4 py-3">Staff báo cáo</th>
                <th className="px-4 py-3">Tiêu đề &amp; Nội dung</th>
                <th className="px-4 py-3">Loại sự cố</th>
                <th className="px-4 py-3">Vị trí</th>
                <th className="px-4 py-3">Mức độ</th>
                <th className="px-4 py-3">Trạng thái xử lý (Admin)</th>
                <th className="px-4 py-3">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inc) => {
                const sev = SEVERITY_BADGES[inc.severity] || { label: inc.severity, variant: "secondary" }
                const catLabel = CATEGORY_LABELS[inc.category] || inc.category || "Khác"
                const staff = inc.staffId
                const eventObj = typeof inc.eventId === "object" ? inc.eventId : null

                return (
                  <tr key={inc._id} className="hover:bg-muted/30 transition-colors">
                    {/* Event info */}
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                        {eventObj?.title || "Sự kiện"}
                      </div>
                    </td>

                    {/* Staff info */}
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                        {staff?.fullName || "Staff"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{staff?.email || "—"}</div>
                      {staff?.phone && <div className="text-xs text-muted-foreground">{staff.phone}</div>}
                    </td>

                    {/* Incident title & desc */}
                    <td className="px-4 py-4 align-top">
                      <p className="font-bold text-foreground text-sm">{inc.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                        {inc.description}
                      </p>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex items-center text-xs text-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-lg border border-border">
                        {catLabel}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex items-center gap-1 text-xs text-foreground font-medium bg-amber-500/10 text-amber-600 px-2 py-1 rounded-lg">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {inc.location}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-4 align-top">
                      <Badge variant={sev.variant}>{sev.label}</Badge>
                    </td>

                    {/* Admin Status Dropdown / Action */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
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
                      </div>
                    </td>

                    {/* Time */}
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
  )
}
