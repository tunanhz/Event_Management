"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Building2, CalendarDays, Check, FileText, Mail, MapPin, Phone, Ticket, Users, X,
} from "lucide-react"
import { cn, formatDateTime, formatVnd, formatNumber } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ModerationDecisionModal } from "./ModerationDecisionModal"
import { DOCUMENT_TYPE_LABELS, type ModerationEventDetail } from "./moderation-detail-data"
import type { ModerationStatus } from "@/types"

const TABS = [
  { id: "info", label: "Thông tin" },
  { id: "tickets", label: "Loại vé" },
  { id: "documents", label: "Hồ sơ pháp lý" },
] as const

type TabId = (typeof TABS)[number]["id"]

const STATUS_BADGE: Record<ModerationStatus, { label: string; variant: "warning" | "success" | "destructive" }> = {
  pending: { label: "Chờ duyệt", variant: "warning" },
  approved: { label: "Đã duyệt", variant: "success" },
  rejected: { label: "Đã từ chối", variant: "destructive" },
}

// Panel thẩm định hồ sơ sự kiện cho Admin: xem thông tin/vé/hồ sơ rồi
// Duyệt hoặc Từ chối (bắt buộc lý do). Dữ liệu mock, trạng thái cục bộ.
export function ModerationDetailView({ detail }: { detail: ModerationEventDetail }) {
  const [status, setStatus] = useState<ModerationStatus>(detail.status)
  const [rejectionReason, setRejectionReason] = useState(detail.rejectionReason)
  const [tab, setTab] = useState<TabId>("info")
  const [modal, setModal] = useState<"approve" | "reject" | null>(null)

  const badge = STATUS_BADGE[status]

  const decide = (reason?: string) => {
    setStatus(modal === "approve" ? "approved" : "rejected")
    if (modal === "reject") setRejectionReason(reason)
    setModal(null)
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Link
        href="/dashboard/moderation"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Hàng đợi kiểm duyệt
      </Link>

      {/* Header + hành động */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">{detail.title}</h2>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" />{detail.organizer}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{detail.location}</span>
            <Badge variant="secondary">{detail.category}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Gửi duyệt lúc {formatDateTime(detail.submittedAt)}</p>
        </div>

        {status === "pending" && (
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={() => setModal("approve")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 cursor-pointer"
            >
              <Check className="h-4 w-4" /> Duyệt & công bố
            </button>
            <button
              onClick={() => setModal("reject")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 cursor-pointer"
            >
              <X className="h-4 w-4" /> Từ chối
            </button>
          </div>
        )}
      </div>

      {status === "rejected" && rejectionReason && (
        <div role="alert" className="rounded-2xl border border-rose-300/60 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
          <p className="font-semibold">Lý do từ chối (đã gửi Ban tổ chức):</p>
          <p className="mt-1">{rejectionReason}</p>
        </div>
      )}
      {status === "approved" && (
        <div className="rounded-2xl border border-emerald-300/60 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Sự kiện đã được duyệt và công bố lên trang công khai. Thông báo đã gửi tới Ban tổ chức.
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer",
              tab === t.id
                ? "bg-cyan-600 text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        {tab === "info" && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-foreground">{detail.description}</p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <InfoRow icon={CalendarDays} label="Bắt đầu" value={formatDateTime(detail.startDate)} />
              <InfoRow icon={CalendarDays} label="Kết thúc" value={formatDateTime(detail.endDate)} />
              <InfoRow icon={Users} label="Sức chứa" value={`${formatNumber(detail.capacity)} người`} />
              <InfoRow icon={Ticket} label="Số loại vé" value={`${detail.tickets.length}`} />
              <InfoRow icon={Mail} label="Email BTC" value={detail.organizerEmail} />
              <InfoRow icon={Phone} label="Điện thoại BTC" value={detail.organizerPhone} />
            </dl>
          </div>
        )}

        {tab === "tickets" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-130 text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="pb-2 pr-4 font-semibold">Loại vé</th>
                  <th className="pb-2 pr-4 font-semibold">Giá</th>
                  <th className="pb-2 pr-4 font-semibold">Số lượng</th>
                  <th className="pb-2 font-semibold">Thời gian bán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detail.tickets.map((t) => (
                  <tr key={t.name}>
                    <td className="py-3 pr-4 font-semibold text-foreground">{t.name}</td>
                    <td className="py-3 pr-4 tabular-nums text-foreground">{t.price === 0 ? "Miễn phí" : formatVnd(t.price)}</td>
                    <td className="py-3 pr-4 tabular-nums text-foreground">{formatNumber(t.quantity)}</td>
                    <td className="py-3 text-muted-foreground">
                      {formatDateTime(t.saleStart)} → {formatDateTime(t.saleEnd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "documents" && (
          <ul className="space-y-2">
            {detail.documents.map((doc) => (
              <li key={doc.name} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <FileText className="h-5 w-5 flex-shrink-0 text-cyan-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_TYPE_LABELS[doc.type]} · {Math.round(doc.sizeKb)} KB
                  </p>
                </div>
                <Badge variant="secondary">Mock</Badge>
              </li>
            ))}
            {detail.documents.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Ban tổ chức chưa đính kèm hồ sơ nào.</p>
            )}
          </ul>
        )}
      </div>

      {modal && (
        <ModerationDecisionModal
          mode={modal}
          eventTitle={detail.title}
          onConfirm={decide}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-background p-3">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-500" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-semibold text-foreground">{value}</dd>
      </div>
    </div>
  )
}
