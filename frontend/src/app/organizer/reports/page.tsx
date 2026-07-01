"use client"

import { Inbox } from "lucide-react"
import { useOrganizerTitle } from "@/components/organizer/OrganizerShellContext"
import styles from "./reports.module.css"

const COLUMNS = ["File", "Ngày Tạo", "Người tạo", "Trạng thái xử lý"]

/** Report management ("Quản lý báo cáo"): exported report files table. */
export default function OrganizerReportsPage() {
  useOrganizerTitle("Quản lý báo cáo")

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkCol} scope="col">
                  <input type="checkbox" className={styles.check} aria-label="Chọn tất cả" />
                </th>
                {COLUMNS.map((col) => (
                  <th key={col} scope="col">
                    {col}
                  </th>
                ))}
                <th className={styles.actionCol} scope="col">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.emptyCell} colSpan={COLUMNS.length + 2}>
                  <div className={styles.empty}>
                    <Inbox size={56} className={styles.emptyIcon} aria-hidden="true" />
                    <p className={styles.emptyText}>Chưa có báo cáo nào</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
