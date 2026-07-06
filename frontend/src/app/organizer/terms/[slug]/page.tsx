"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useOrganizerTitle } from "@/components/organizer/OrganizerShellContext"
import { getTermById } from "@/components/organizer/terms-data"
import styles from "./terms-viewer.module.css"

/** PDF viewer for a single organizer term ("xem chi tiết"). */
export default function TermViewerPage() {
  useOrganizerTitle("Điều khoản cho Ban tổ chức")
  const params = useParams<{ slug: string }>()
  const term = getTermById(params.slug)

  if (!term) {
    return (
      <div className={styles.viewer}>
        <div className={styles.missing}>
          <p className={styles.missingTitle}>Không tìm thấy điều khoản</p>
          <Link href="/organizer/terms" className={styles.back}>
            <ChevronLeft size={18} aria-hidden="true" />
            Quay lại danh sách
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.viewer}>
      {/* Toolbar intentionally omitted — the browser's native PDF viewer
          provides download/print/zoom; back navigation is via the sidebar. */}
      <iframe
        key={term.id}
        src={`${term.pdfUrl}#view=FitH`}
        title={term.fileName}
        className={styles.frame}
      />
    </div>
  )
}
