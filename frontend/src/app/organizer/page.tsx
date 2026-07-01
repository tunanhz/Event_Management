"use client"

import { useState } from "react"
import { Search, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { NoticeModal } from "@/components/organizer/NoticeModal"
import { useOrganizerTitle } from "@/components/organizer/OrganizerShellContext"
import styles from "./my-events.module.css"

const TABS = [
  { id: "upcoming", label: "Sắp tới" },
  { id: "past", label: "Đã qua" },
  { id: "pending", label: "Chờ duyệt" },
  { id: "draft", label: "Nháp" },
] as const

type TabId = (typeof TABS)[number]["id"]

/** Organizer landing ("Sự kiện của tôi"): search + status tabs + event list. */
export default function MyEventsPage() {
  useOrganizerTitle("Sự kiện của tôi")
  const [showNotice, setShowNotice] = useState(true)
  const [tab, setTab] = useState<TabId>("upcoming")
  const [query, setQuery] = useState("")

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
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={cn(styles.tab, tab === t.id && styles.tabActive)}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.empty}>
            <Inbox size={72} className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyText}>Chưa có sự kiện nào trong mục này.</p>
          </div>
        </div>
      </div>
    </>
  )
}
