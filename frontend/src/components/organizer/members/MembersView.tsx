"use client"

import { useMemo, useState } from "react"
import { Search, Plus, Filter } from "lucide-react"
import { eventMembers } from "./members-data"
import styles from "./members.module.css"

/** Members ("Thành viên"): searchable roster of an event's team members. */
export function MembersView() {
  const [query, setQuery] = useState("")

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return eventMembers
    return eventMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q)
    )
  }, [query])

  return (
    <>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Thành viên</h2>
        <button type="button" className={styles.addBtn}>
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
        <button type="button" className={styles.filterBtn}>
          <Filter size={15} aria-hidden="true" />
          Tất cả ({rows.length})
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Tên thành viên</th>
              <th scope="col">Vai trò</th>
              <th scope="col">Thành viên</th>
              <th scope="col">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan={4}>
                  Không tìm thấy thành viên nào.
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className={styles.memberName}>
                      <span
                        className={`${styles.dot} ${m.online ? styles.dotOnline : ""}`}
                        aria-hidden="true"
                      />
                      <span className={styles.nameText}>
                        {m.name} ({m.code})
                      </span>
                    </span>
                  </td>
                  <td className={styles.role}>{m.role}</td>
                  <td className={styles.email}>{m.email}</td>
                  <td>
                    <button type="button" className={styles.detailLink}>
                      Xem chi tiết
                    </button>
                  </td>
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
