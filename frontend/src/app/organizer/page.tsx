"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Search, Inbox, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { NoticeModal } from "@/components/organizer/NoticeModal"
import { useOrganizerTitle } from "@/components/organizer/OrganizerShellContext"
import { MyEventCard } from "@/components/organizer/MyEventCard"
import type { OrganizerEvent, OrgEventStatus } from "@/components/organizer/my-events-data"
import { fetchMyEvents, submitForReview } from "@/components/organizer/organizer-my-events-api"
import styles from "./my-events.module.css"

const TABS = [
  { id: "upcoming", label: "Sắp tới" },
  { id: "past", label: "Đã qua" },
  { id: "pending", label: "Chờ duyệt" },
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
  const [page, setPage] = useState(1)

  const [events, setEvents] = useState<OrganizerEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

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
    setTab(TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await fetchMyEvents())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách sự kiện")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const submit = async (id: string) => {
    setSubmittingId(id)
    setError(null)
    try {
      await submitForReview(id)
      await reload()
      setTab("pending") // event moves to the "Chờ duyệt" tab
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi duyệt thất bại")
    } finally {
      setSubmittingId(null)
    }
  }

  // Events matching the active tab + search query.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter(
      (e) => e.status === tab && (q === "" || e.title.toLowerCase().includes(q))
    )
  }, [events, tab, query])

  // Reset to the first page whenever the filter changes.
  useEffect(() => setPage(1), [tab, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

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
                  onClick={() => setTab(t.id)}
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
          {tab === "pending" && filtered.length > 0 && (
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
          ) : visible.length > 0 ? (
            <>
              <div className={styles.list}>
                {visible.map((event) => (
                  <MyEventCard
                    key={event.id}
                    event={event}
                    onSubmit={submit}
                    submitting={submittingId === event.id}
                  />
                ))}
              </div>

              <nav className={styles.pager} aria-label="Phân trang">
                <button
                  type="button"
                  className={styles.pageNav}
                  onClick={() => setPage(current - 1)}
                  disabled={current === 1}
                  aria-label="Trang trước"
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(styles.pageBtn, p === current && styles.pageBtnActive)}
                    aria-current={p === current ? "page" : undefined}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.pageNav}
                  onClick={() => setPage(current + 1)}
                  disabled={current === totalPages}
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
