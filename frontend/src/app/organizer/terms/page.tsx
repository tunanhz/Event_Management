"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useOrganizerTitle } from "@/components/organizer/OrganizerShellContext"
import { ORGANIZER_TERMS } from "@/components/organizer/terms-data"
import styles from "./terms.module.css"

/** Terms for organizers ("Điều khoản cho Ban tổ chức") — each links to a PDF viewer. */
export default function OrganizerTermsPage() {
  useOrganizerTitle("Điều khoản cho Ban tổ chức")

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        {ORGANIZER_TERMS.map((term, i) => (
          <div key={term.id} className={styles.item}>
            <Link href={`/organizer/terms/${term.id}`} className={styles.row}>
              <span className={styles.index}>{i + 1}.</span>
              <span className={styles.title}>{term.title}</span>
              <ChevronRight size={20} className={styles.chevron} aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
