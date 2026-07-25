"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Building2, CalendarDays, Check, FileText, Loader2,
  Mail, MapPin, Phone, Ticket, Users, X, Wrench, CreditCard,
  Copy, ExternalLink, Lock,
} from "lucide-react"
import { cn, formatDateTime, formatVnd, formatNumber } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ModerationDecisionModal } from "./ModerationDecisionModal"
import { DOCUMENT_TYPE_LABELS, type ModerationEventDetail } from "./moderation-detail-data"
import { approveEvent, fetchModerationDetail, rejectEvent } from "./moderation-api"
import type { ModerationStatus } from "@/types"

const TABS = [
  { id: "info", label: "Thông tin" },
  { id: "tickets", label: "Loại vé" },
  { id: "services", label: "Dịch vụ & Hợp đồng" },
  { id: "documents", label: "Hồ sơ pháp lý" },
] as const

type TabId = (typeof TABS)[number]["id"]

const STATUS_BADGE: Record<ModerationStatus, { label: string; variant: "warning" | "success" | "destructive" }> = {
  pending: { label: "Chờ duyệt", variant: "warning" },
  waiting_deposit: { label: "Chờ cọc 20%", variant: "warning" },
  approved: { label: "Đã duyệt", variant: "success" },
  rejected: { label: "Đã từ chối", variant: "destructive" },
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
  if (s.startsWith("khac:")) return s.slice(5).trim()
  return s
}

// Panel thẩm định hồ sơ sự kiện cho Admin — nối API /api/admin/events/:id.
// Xem thông tin/vé/dịch vụ/hồ sơ rồi Duyệt (kèm báo giá nếu có dịch vụ) hoặc Từ chối.
export function ModerationDetailView({ eventId }: { eventId: string }) {
  const [detail, setDetail] = useState<ModerationEventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>("info")
  const [modal, setModal] = useState<"approve" | "reject" | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDetail(await fetchModerationDetail(eventId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được hồ sơ sự kiện")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  const decide = async (reason?: string, serviceCost?: number) => {
    const mode = modal
    setModal(null)
    if (!mode) return
    setBusy(true)
    setError(null)
    try {
      if (mode === "approve") await approveEvent(eventId, serviceCost ?? 0)
      else await rejectEvent(eventId, reason ?? "")
      await load() // reflect the new reviewStatus + rejectionReason
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xử lý quyết định thất bại")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin opacity-60" />
        <p className="text-sm">Đang tải hồ sơ sự kiện…</p>
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/moderation" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Hàng đợi kiểm duyệt
        </Link>
        <div role="alert" className="rounded-2xl border border-rose-300/60 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      </div>
    )
  }

  if (!detail) return null

  const status = detail.status
  const badge = STATUS_BADGE[status]
  const serviceCost = detail.serviceCost ?? 0
  const depositAmount = detail.depositAmount ?? 0
  const finalPaymentAmount = detail.finalPaymentAmount || (serviceCost > 0 ? (serviceCost - depositAmount + (detail.additionalCost ?? 0)) : 0)
  const logisticsServices = detail.logisticsServices ?? []

  return (
    <div className="space-y-6 animate-fade-up">
      <Link
        href="/dashboard/moderation"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Hàng đợi kiểm duyệt
      </Link>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

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
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Duyệt
            </button>
            <button
              onClick={() => setModal("reject")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-50 cursor-pointer"
            >
              <X className="h-4 w-4" /> Từ chối
            </button>
          </div>
        )}
      </div>

      {/* Status alerts */}
      {status === "rejected" && detail.rejectionReason && (
        <div role="alert" className="rounded-2xl border border-rose-300/60 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
          <p className="font-semibold">Lý do từ chối (đã gửi Ban tổ chức):</p>
          <p className="mt-1">{detail.rejectionReason}</p>
        </div>
      )}
      {status === "waiting_deposit" && (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
          <p className="font-semibold">Đã duyệt — chờ Organizer cọc 20%</p>
          <p className="mt-1">
            Chi phí dịch vụ: <span className="font-bold">{formatVnd(serviceCost)}</span>
            {" · "}Cọc 20%: <span className="font-bold">{formatVnd(depositAmount)}</span>
            {" · "}Trạng thái cọc: <Badge variant={detail.depositStatus === "PAID" ? "success" : "warning"}>
              {detail.depositStatus === "PAID" ? "Đã cọc" : "Chưa cọc"}
            </Badge>
          </p>
        </div>
      )}
      {status === "approved" && (
        <div className="rounded-2xl border border-emerald-300/60 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Sự kiện đã được duyệt và công bố lên trang công khai.
          {serviceCost > 0 && (
            <span className="ml-1 font-normal">
              Chi phí dịch vụ: {formatVnd(serviceCost)} · Cọc: {formatVnd(depositAmount)} (đã thanh toán)
            </span>
          )}
        </div>
      )}

      {/* Financial summary for events with services */}
      {serviceCost > 0 && (status === "approved" || status === "waiting_deposit") && (
        <div className="grid gap-3 sm:grid-cols-3">
          <FinanceCard icon={CreditCard} label="Chi phí dịch vụ" value={formatVnd(serviceCost)} />
          <FinanceCard
            icon={CreditCard}
            label="Cọc 20%"
            value={formatVnd(depositAmount)}
            badge={detail.depositStatus === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}
            badgeVariant={detail.depositStatus === "PAID" ? "success" : "warning"}
          />
          <FinanceCard
            icon={CreditCard}
            label="Còn lại sau sự kiện"
            value={formatVnd(finalPaymentAmount)}
            badge={detail.finalPaymentStatus === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}
            badgeVariant={detail.finalPaymentStatus === "PAID" ? "success" : "warning"}
          />
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
            {detail.description ? (
              <div
                className="text-sm leading-relaxed text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: detail.description }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có mô tả.</p>
            )}
            <dl className="grid gap-3 sm:grid-cols-2">
              {/* Row 1 */}
              <InfoRow icon={CalendarDays} label="Bắt đầu" value={detail.startDate ? formatDateTime(detail.startDate) : "—"} />
              <InfoRow icon={CalendarDays} label="Kết thúc" value={detail.endDate ? formatDateTime(detail.endDate) : "—"} />

              {/* Row 2 */}
              <InfoRow icon={Users} label="Sức chứa" value={`${formatNumber(detail.capacity)} người`} />
              <InfoRow icon={Ticket} label="Số loại vé" value={`${detail.tickets.length}`} />

              {/* Row 3 */}
              <InfoRow
                icon={Lock}
                label="Loại sự kiện"
                value={
                  <Badge
                    variant={detail.privacy === "private" ? "secondary" : "outline"}
                    className={
                      detail.privacy === "private"
                        ? "bg-amber-500/10 text-amber-600 border-amber-300 font-bold"
                        : "bg-cyan-500/10 text-cyan-600 border-cyan-300 font-bold"
                    }
                  >
                    {detail.privacy === "private" ? "Riêng tư 🔒" : "Công khai 🌐"}
                  </Badge>
                }
              />
              <InfoRow
                icon={ExternalLink}
                label="Đường dẫn sự kiện (Link)"
                value={
                  <div className="flex items-center gap-2 mt-0.5">
                    <a
                      href={`/su-kien/${detail.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:underline font-mono text-xs truncate max-w-[200px]"
                    >
                      {typeof window !== "undefined" ? `${window.location.origin}/su-kien/${detail.id}` : `/su-kien/${detail.id}`}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const url = typeof window !== "undefined" ? `${window.location.origin}/su-kien/${detail.id}` : `/su-kien/${detail.id}`
                        navigator.clipboard.writeText(url)
                        alert("Đã sao chép đường dẫn sự kiện!")
                      }}
                      className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                      Sao chép
                    </button>
                  </div>
                }
              />

              {/* Row 4 (Dòng cuối) */}
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
                {detail.tickets.map((t, i) => (
                  <tr key={t.id ?? i}>
                    <td className="py-3 pr-4 font-semibold text-foreground">{t.name}</td>
                    <td className="py-3 pr-4 tabular-nums text-foreground">{t.price === 0 ? "Miễn phí" : formatVnd(t.price)}</td>
                    <td className="py-3 pr-4 tabular-nums text-foreground">{formatNumber(t.quantity)}</td>
                    <td className="py-3 text-muted-foreground">
                      {t.saleStart ? formatDateTime(t.saleStart) : "—"} → {t.saleEnd ? formatDateTime(t.saleEnd) : "—"}
                    </td>
                  </tr>
                ))}
                {detail.tickets.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Chưa có loại vé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "services" && (
          <div className="space-y-5">
            {/* Logistics services */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Wrench className="h-4 w-4 text-cyan-500" /> Dịch vụ yêu cầu
              </h4>
              {logisticsServices.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {logisticsServices.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <span className="h-2 w-2 rounded-full bg-cyan-500" />
                      {formatServiceLabel(s)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Organizer không yêu cầu thuê dịch vụ nền tảng.</p>
              )}
            </div>

            {/* Full Contract Document View */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                <FileText className="h-4 w-4 text-cyan-500" /> Hợp đồng dịch vụ nền tảng đã ký
              </h4>
              {detail.contract ? (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
                  {/* Contract Header */}
                  <div className="text-center space-y-1.5 border-b border-border pb-4">
                    <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                      <br />
                      <span className="text-foreground">Độc lập – Tự do – Hạnh phúc</span>
                    </p>
                    <h3 className="text-lg font-extrabold text-foreground mt-3">HỢP ĐỒNG DỊCH VỤ NỀN TẢNG SỰ KIỆN</h3>
                    <p className="text-xs text-muted-foreground">
                      Xác nhận điện tử ngày {formatDateTime(detail.submittedAt)}
                    </p>
                  </div>

                  {/* Contract Parties */}
                  <div className="rounded-xl bg-muted/30 p-4 text-xs space-y-1.5 border border-border">
                    <p><strong className="text-foreground">Bên A (Nền tảng):</strong> EventBox — Nền tảng quản lý &amp; phân phối vé sự kiện.</p>
                    <p><strong className="text-foreground">Bên B (Ban tổ chức):</strong> {detail.organizer} — Đại diện: <span className="font-bold text-cyan-600">{detail.contract.repName || detail.organizer}</span></p>
                    <p><strong className="text-foreground">Sự kiện đăng ký:</strong> {detail.title}</p>
                  </div>

                  {/* Contract Clauses */}
                  <div className="space-y-4 text-xs text-muted-foreground">
                    <div>
                      <h5 className="font-bold text-foreground mb-1">Điều 1. Các bên</h5>
                      <p>Hợp đồng dịch vụ được ký kết giữa EventBox (bên cung cấp nền tảng — Bên A) và Ban tổ chức (bên đăng tải và vận hành sự kiện — Bên B).</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-foreground mb-1">Điều 2. Phạm vi dịch vụ &amp; Đặt cọc</h5>
                      <p>EventBox cung cấp nền tảng đăng tải sự kiện, bán vé trực tuyến, thu hộ và đối soát doanh thu theo các điều khoản hiện hành. Các hạng mục thuê dịch vụ từ nền tảng cần cọc trước 20% chi phí dịch vụ (chi phí cụ thể do Admin báo giá khi phê duyệt).</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-foreground mb-1">Điều 3. Trách nhiệm Ban tổ chức</h5>
                      <p>Ban tổ chức cam kết cung cấp thông tin sự kiện chính xác, tổ chức đúng như công bố và tuân thủ quy định pháp luật cũng như chính sách nội dung của EventBox.</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-foreground mb-1">Điều 4. Thanh toán &amp; Đối soát</h5>
                      <p>Doanh thu bán vé được đối soát và chuyển cho Ban tổ chức sau khi trừ phí dịch vụ theo tài khoản khai báo.</p>
                    </div>
                  </div>

                  {/* Signature block */}
                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-6 text-center text-xs">
                    <div className="space-y-2">
                      <p className="font-bold text-foreground uppercase">ĐẠI DIỆN BÊN A</p>
                      <p className="text-[11px] text-muted-foreground">(EventBox System)</p>
                      <div className="h-20 flex items-center justify-center">
                        <span className="inline-block rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-bold text-cyan-600">
                          ✓ EventBox Verified
                        </span>
                      </div>
                      <p className="font-semibold text-foreground">Nền tảng EventBox</p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-bold text-foreground uppercase">ĐẠI DIỆN BÊN B</p>
                      <p className="text-[11px] text-muted-foreground">(Chữ ký điện tử của Ban tổ chức)</p>
                      <div className="h-20 flex items-center justify-center rounded-xl border border-dashed border-border bg-background p-1">
                        {detail.contract.signatureUrl ? (
                          <img
                            src={detail.contract.signatureUrl.startsWith("http") || detail.contract.signatureUrl.startsWith("data:") ? detail.contract.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${detail.contract.signatureUrl}`}
                            alt="Chữ ký BTC"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground italic">✓ Đã xác nhận điện tử</span>
                        )}
                      </div>
                      <p className="font-semibold text-foreground">{detail.contract.repName || detail.organizer}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Chưa có thông tin hợp đồng.</p>
              )}
            </div>
          </div>
        )}

        {tab === "documents" && (
          <ul className="space-y-2">
            {detail.documents.map((doc) => {
              const innerContent = (
                <>
                  <FileText className="h-5 w-5 flex-shrink-0 text-cyan-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground group-hover:text-cyan-500 transition-colors">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_TYPE_LABELS[doc.type]}{doc.sizeKb ? ` · ${Math.round(doc.sizeKb)} KB` : ""}
                    </p>
                  </div>
                </>
              )
              if (doc.url) {
                const absUrl = doc.url.startsWith("http")
                  ? doc.url
                  : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${doc.url}`
                return (
                  <li key={doc.name}>
                    <a
                      href={absUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:bg-muted/50"
                    >
                      {innerContent}
                    </a>
                  </li>
                )
              }
              return (
                <li key={doc.name} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                  {innerContent}
                </li>
              )
            })}
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
          logisticsServices={logisticsServices}
          onConfirm={decide}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: React.ReactNode }) {
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

function FinanceCard({
  icon: Icon,
  label,
  value,
  badge,
  badgeVariant = "warning",
}: {
  icon: typeof CreditCard
  label: string
  value: string
  badge?: string
  badgeVariant?: "warning" | "success" | "destructive"
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-500" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
        {badge && <Badge variant={badgeVariant} className="mt-1">{badge}</Badge>}
      </div>
    </div>
  )
}
