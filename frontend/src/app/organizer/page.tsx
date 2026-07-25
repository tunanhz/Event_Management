"use client"

import { useEffect, useRef, useState } from "react"
import { Search, Inbox, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { NoticeModal } from "@/components/organizer/NoticeModal"
import { useOrganizerTitle } from "@/components/organizer/OrganizerShellContext"
import { MyEventCard } from "@/components/organizer/MyEventCard"
import type { OrganizerEvent, OrgEventStatus } from "@/components/organizer/my-events-data"
import {
  fetchMyEventsPage,
  submitForReview,
  payDeposit,
  payRemaining,
  type PaginationMeta,
} from "@/components/organizer/organizer-my-events-api"
import styles from "./my-events.module.css"

const TABS = [
  { id: "upcoming", label: "Sắp tới" },
  { id: "ongoing", label: "Đang diễn ra" },
  { id: "past", label: "Đã qua" },
  { id: "pending", label: "Chờ duyệt" },
  { id: "waiting_deposit", label: "Chờ cọc" },
  { id: "draft", label: "Nháp" },
] as const

type TabId = OrgEventStatus
const PAGE_SIZE = 4

/** Organizer landing ("Sự kiện của tôi"): live events from the API + search +
 *  status tabs + a "gửi duyệt" action for drafts and rejected events. */
export default function MyEventsPage() {
  useOrganizerTitle("Sự kiện của tôi")
  const [showNotice, setShowNotice] = useState(true)
  const [tab, setTab] = useState<TabId>("upcoming")
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [page, setPage] = useState(1)

  const [events, setEvents] = useState<OrganizerEvent[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: PAGE_SIZE,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped to force a refetch of the current tab/page even when neither changed
  // (e.g. after "gửi duyệt" when the event may leave the list).
  const [reloadToken, setReloadToken] = useState(0)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [payingDepositId, setPayingDepositId] = useState<string | null>(null)
  const [payingRemainingId, setPayingRemainingId] = useState<string | null>(null)

  // Switch tab and always return to its first page.
  const selectTab = (id: TabId) => {
    setTab(id)
    setPage(1)
  }

  // Roving focus for the status tablist (WAI-ARIA tabs keyboard pattern).
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const onTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"]
    if (!keys.includes(e.key)) return
    e.preventDefault()
    const last = TABS.length - 1
    const next =
      e.key === "ArrowRight" ? (index + 1) % TABS.length
      : e.key === "ArrowLeft" ? (index - 1 + TABS.length) % TABS.length
      : e.key === "Home" ? 0
      : last
    selectTab(TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  // Debounce the search box; a changed effective query starts back at page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Server-side pagination: refetch whenever the tab, page, search, or reload
  // token changes. Each tab maps to a backend bucket that filters by reviewStatus
  // (+ time window for the PUBLISHED tabs), so pages never mix statuses.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchMyEventsPage(tab, page, PAGE_SIZE, debouncedQuery)
      .then((r) => {
        if (cancelled) return
        setEvents(r.events)
        setPagination(r.pagination)
        // A page left dangling past the end (items moved/removed) snaps back.
        if (r.pagination.totalPages > 0 && page > r.pagination.totalPages) {
          setPage(r.pagination.totalPages)
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Không tải được danh sách sự kiện")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, page, debouncedQuery, reloadToken])

  const submit = async (id: string) => {
    setSubmittingId(id)
    setError(null)
    try {
      await submitForReview(id)
      selectTab("pending") // event moves to the "Chờ duyệt" tab
      setReloadToken((n) => n + 1) // ensure a refetch even if already on that tab/page
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi duyệt thất bại")
    } finally {
      setSubmittingId(null)
    }
  }

  // Both handlers below only fetch a VNPAY redirect URL and leave the SPA — the
  // reviewStatus/depositStatus/finalPaymentStatus flip happens server-side once VNPAY
  // confirms, and the organizer lands back on /organizer/vnpay-return afterwards. Don't
  // clear the paying-id on success: the navigation away makes that moot, and keeping the
  // button disabled avoids a double-click firing a second payment URL before redirect.
  const handlePayDeposit = async (id: string) => {
    setPayingDepositId(id)
    setError(null)
    try {
      const paymentUrl = await payDeposit(id)
      window.location.href = paymentUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo liên kết thanh toán cọc")
      setPayingDepositId(null)
    }
  }

  const handlePayRemaining = async (id: string) => {
    setPayingRemainingId(id)
    setError(null)
    try {
      const paymentUrl = await payRemaining(id)
      window.location.href = paymentUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo liên kết thanh toán")
      setPayingRemainingId(null)
    }
  }

  const totalPages = Math.max(1, pagination.totalPages)

  return (
    <>
      {showNotice && <NoticeModal onClose={() => setShowNotice(false)} />}

      <div className={styles.wrap}>
        <div className={styles.main}>
          <div className={styles.toolbar}>
            <form
              className={styles.search}
              role="search"
              onSubmit={(e) => e.preventDefault()}
            >
              <Search size={18} className={styles.searchIcon} aria-hidden="true" />
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Tìm kiếm sự kiện"
                aria-label="Tìm kiếm sự kiện"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className={styles.searchBtn}>
                Tìm kiếm
              </button>
            </form>

            <div className={styles.tabs} role="tablist" aria-label="Trạng thái sự kiện">
              {TABS.map((t, i) => (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[i] = el
                  }}
                  id={`my-events-tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls="my-events-panel"
                  tabIndex={tab === t.id ? 0 : -1}
                  className={cn(styles.tab, tab === t.id && styles.tabActive)}
                  onClick={() => selectTab(t.id)}
                  onKeyDown={(e) => onTabKeyDown(e, i)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div
            id="my-events-panel"
            role="tabpanel"
            aria-labelledby={`my-events-tab-${tab}`}
            className={styles.panel}
          >

          {error && (
            <div className={cn(styles.notice, styles.noticeError)} role="alert">
              {error}
            </div>
          )}

          {/* Pending-approval notice (shown on the "Chờ duyệt" tab) */}
          {tab === "pending" && events.length > 0 && (
            <div className={styles.notice} role="note">
              <span>
                <strong className={styles.noticeStrong}>Lưu ý</strong>: Sự kiện đang
                chờ duyệt. Để đảm bảo tính bảo mật cho sự kiện của bạn, quyền truy
                cập vào trang chỉ dành cho chủ sở hữu và quản trị viên được ủy quyền.
              </span>
            </div>
          )}

          {loading ? (
            <div className={styles.empty}>
              <Loader2 size={48} className={styles.emptyIcon} style={{ animation: "spin 0.8s linear infinite" }} aria-hidden="true" />
              <p className={styles.emptyText}>Đang tải sự kiện của bạn…</p>
            </div>
          ) : events.length > 0 ? (
            <>
              <div className={styles.list}>
                {events.map((event) => (
                  <MyEventCard
                    key={event.id}
                    event={event}
                    onSubmit={submit}
                    submitting={submittingId === event.id}
                    onPayDeposit={handlePayDeposit}
                    payingDeposit={payingDepositId === event.id}
                    onPayRemaining={handlePayRemaining}
                    payingRemaining={payingRemainingId === event.id}
                  />
                ))}
              </div>

              <nav className={styles.pager} aria-label="Phân trang">
                <button
                  type="button"
                  className={styles.pageNav}
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Trang trước"
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(styles.pageBtn, p === page && styles.pageBtnActive)}
                    aria-current={p === page ? "page" : undefined}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.pageNav}
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Trang sau"
                >
                  <ChevronRight size={18} />
                </button>
              </nav>
            </>
          ) : (
            <div className={styles.empty}>
              <Inbox size={72} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>Chưa có sự kiện nào trong mục này.</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  )
}
