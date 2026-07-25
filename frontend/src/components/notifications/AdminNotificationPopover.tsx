"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  ClipboardCheck,
  Wallet,
  AlertTriangle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { clientApi } from "@/lib/client-api"
import { formatVnd, formatDateTime } from "@/lib/utils"

interface AdminNotificationItem {
  id: string
  type: "MODERATION" | "WITHDRAWAL" | "INCIDENT"
  title: string
  subtitle: string
  description: string
  createdAt: string
  href: string
}

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

export function AdminNotificationPopover() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<AdminNotificationItem[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const loadNotifications = async () => {
    setLoading(true)
    const list: AdminNotificationItem[] = []

    try {
      // 1. Events pending approval (Moderation)
      const eventsRes = await clientApi
        .get<ApiEnvelope<any>>("/events/admin?limit=100")
        .catch(() => null)
      if (eventsRes?.data) {
        const rawEvents = Array.isArray(eventsRes.data)
          ? eventsRes.data
          : eventsRes.data.events || []
        const pendingEvents = rawEvents.filter(
          (e: any) => e.reviewStatus === "PENDING_REVIEW"
        )
        pendingEvents.forEach((ev: any) => {
          list.push({
            id: `mod-${ev._id}`,
            type: "MODERATION",
            title: "Yêu cầu duyệt sự kiện",
            subtitle: ev.title || "Sự kiện mới",
            description: `Ban tổ chức vừa gửi yêu cầu duyệt sự kiện "${ev.title || "Chưa đặt tên"}".`,
            createdAt: ev.createdAt || ev.updatedAt || new Date().toISOString(),
            href: "/dashboard/moderation",
          })
        })
      }

      // 2. Pending Payout / Withdrawal requests (Finance)
      const payoutsRes = await clientApi
        .get<ApiEnvelope<any[]>>("/finance/payouts")
        .catch(() => null)
      if (payoutsRes?.data) {
        const pendingPayouts = (payoutsRes.data ?? []).filter(
          (p: any) => p.status === "PENDING"
        )
        pendingPayouts.forEach((p: any) => {
          const amountStr = typeof p.amount === "number" ? formatVnd(p.amount) : ""
          list.push({
            id: `pay-${p._id}`,
            type: "WITHDRAWAL",
            title: "Yêu cầu rút tiền mới",
            subtitle: p.organizerName || "Ban tổ chức",
            description: `Yêu cầu giải ngân ${amountStr} cho sự kiện "${p.eventTitle || ""}".`,
            createdAt: p.createdAt || new Date().toISOString(),
            href: "/dashboard/finance",
          })
        })
      }

      // 3. Open Staff Incidents (Incidents)
      const incidentsRes = await clientApi
        .get<ApiEnvelope<any[]>>("/staff/admin/incidents?status=OPEN")
        .catch(() => null)
      if (incidentsRes?.data) {
        const openIncidents = incidentsRes.data ?? []
        openIncidents.forEach((inc: any) => {
          const staffName = inc.staffId?.fullName || "Staff"
          list.push({
            id: `inc-${inc._id}`,
            type: "INCIDENT",
            title: `Báo cáo sự cố: ${inc.title}`,
            subtitle: `Staff: ${staffName} • Vị trí: ${inc.location}`,
            description: inc.description || "Có sự cố mới được ghi nhận tại sự kiện.",
            createdAt: inc.createdAt || new Date().toISOString(),
            href: "/dashboard/incidents",
          })
        })
      }

      // Sort newest first
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setItems(list)
    } catch (err) {
      console.error("Error loading admin notifications:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
    // Poll every 30 seconds for background updates
    const interval = setInterval(loadNotifications, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const unreadCount = items.length

  const handleItemClick = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-muted cursor-pointer"
        aria-label={unreadCount > 0 ? `Thông báo — ${unreadCount} chưa xử lý` : "Thông báo"}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-cyan-600" />
              <h3 className="font-bold text-sm text-foreground">Thông báo hệ thống</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-500">
                  {unreadCount} cần xử lý
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={loadNotifications}
              title="Làm mới thông báo"
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-xs text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                Đang tải thông báo...
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 opacity-60 mb-2" />
                <p className="font-semibold text-foreground">Hệ thống hoạt động tốt</p>
                <p className="mt-0.5 text-muted-foreground">Không có yêu cầu hay sự cố nào cần xử lý.</p>
              </div>
            ) : (
              items.map((item) => {
                let icon = <ClipboardCheck className="h-4 w-4 text-cyan-500" />
                let badgeStyle = "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
                let badgeLabel = "Kiểm duyệt"

                if (item.type === "WITHDRAWAL") {
                  icon = <Wallet className="h-4 w-4 text-emerald-500" />
                  badgeStyle = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  badgeLabel = "Rút tiền"
                } else if (item.type === "INCIDENT") {
                  icon = <AlertTriangle className="h-4 w-4 text-amber-500" />
                  badgeStyle = "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  badgeLabel = "Sự cố"
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item.href)}
                    className="w-full p-3.5 text-left hover:bg-muted/40 transition-colors flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted border border-border">
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-foreground group-hover:text-cyan-600 transition-colors truncate">
                          {item.title}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                          {badgeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 mt-0.5 line-clamp-1">
                        {item.subtitle}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(item.createdAt)}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                  </button>
                )
              })
            )}
          </div>

          {/* Footer link to view details */}
          {items.length > 0 && (
            <div className="border-t border-border bg-muted/20 p-2 text-center">
              <span className="text-[11px] text-muted-foreground">
                Bấm vào thông báo để chuyển tới trang xử lý tương ứng
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
