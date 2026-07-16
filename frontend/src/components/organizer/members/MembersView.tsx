"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Plus, Filter, Loader2 } from "lucide-react"
import {
  fetchEventMembers,
  MEMBER_STATUS_LABELS,
  FILTERABLE_MEMBER_STATUSES,
  type EventMemberApi,
  type MemberStatus,
} from "./organizer-members-api"
import styles from "./members.module.css"

/**
 * Members ("Thành viên"): staff assigned to this event, loaded from the real
 * GET /organizer/events/:id/members endpoint. Assignment itself is an ADMIN
 * action (business.md §2.1) — the organizer views the roster read-only.
 */
export function MembersView({ eventId }: { eventId: string }) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">("all")
  const [members, setMembers] = useState<EventMemberApi[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchEventMembers(eventId)
      .then((rows) => {
        if (active) setMembers(rows)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Không tải được danh sách thành viên")
      })
    return () => {
      active = false
    }
  }, [eventId])

  // Search first, independent of the status filter — the filter dropdown's
  // per-status counts are derived from this so they don't shift as the
  // organizer switches statuses (only the search box affects them).
  const searchFiltered = useMemo(() => {
    const list = members ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (m) =>
        m.staffName.toLowerCase().includes(q) ||
        m.staffEmail.toLowerCase().includes(q) ||
        m.roleInEvent.toLowerCase().includes(q)
    )
  }, [members, query])

  // StaffAssignment.status (ERD) — the same enum the backend stores, so this
  // filter can't drift from what the API actually returns.
  const rows = useMemo(
    () =>
      statusFilter === "all"
        ? searchFiltered
        : searchFiltered.filter((m) => m.status === statusFilter),
    [searchFiltered, statusFilter]
  )

  return (
    <>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Thành viên</h2>
        <button
          type="button"
          className={styles.addBtn}
          disabled
          title="Nhân sự sự kiện do Admin phân công (Staff Assignment)"
        >
          <Plus size={18} aria-hidden="true" />
          Thêm thành viên
        </button>
      </div>

      <div className={styles.searchBar}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Tìm kiếm thành viên"
          aria-label="Tìm kiếm thành viên"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className={styles.filterRow}>
        <div className={styles.filterWrap}>
          <Filter size={15} className={styles.filterIcon} aria-hidden="true" />
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MemberStatus | "all")}
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả ({searchFiltered.length})</option>
            {FILTERABLE_MEMBER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MEMBER_STATUS_LABELS[s]} ({searchFiltered.filter((m) => m.status === s).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Tên thành viên</th>
              <th scope="col">Vai trò tại sự kiện</th>
              <th scope="col">Email</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td className={styles.emptyCell} colSpan={4} role="alert">
                  {error}
                </td>
              </tr>
            ) : members === null ? (
              <tr>
                <td className={styles.emptyCell} colSpan={4}>
                  <Loader2
                    size={20}
                    aria-hidden="true"
                    style={{ animation: "spin 0.8s linear infinite", verticalAlign: "middle" }}
                  />{" "}
                  Đang tải danh sách thành viên…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan={4}>
                  {(members ?? []).length === 0
                    ? "Chưa có nhân sự nào được Admin phân công cho sự kiện này."
                    : "Không có thành viên nào khớp với tìm kiếm/bộ lọc."}
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className={styles.memberName}>
                      <span
                        className={`${styles.dot} ${
                          m.status === "CONFIRMED" ? styles.dotOnline : ""
                        }`}
                        aria-hidden="true"
                      />
                      <span className={styles.nameText}>{m.staffName}</span>
                    </span>
                  </td>
                  <td className={styles.role}>{m.roleInEvent}</td>
                  <td className={styles.email}>{m.staffEmail}</td>
                  <td className={styles.role}>{MEMBER_STATUS_LABELS[m.status] ?? m.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className={styles.pager}>
          <button type="button" className={styles.pageBtn} aria-current="page">
            1
          </button>
        </div>
      )}
    </>
  )
}
