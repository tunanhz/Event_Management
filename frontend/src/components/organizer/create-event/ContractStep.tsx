"use client"

import { FileText, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionCard } from "./SectionCard"
import { ORGANIZER_TERMS } from "../terms-data"
import type { CreateEventForm } from "./create-event-data"
import formStyles from "./create-event-form.module.css"
import styles from "./contract-step.module.css"
import pageStyles from "@/app/organizer/create-event/create-event.module.css"

interface ContractStepProps {
  form: CreateEventForm
  update: (patch: Partial<CreateEventForm>) => void
}

/** Standard service-contract clauses between the organizer and the platform. */
const CONTRACT_CLAUSES: { title: string; text: string }[] = [
  {
    title: "1. Các bên",
    text: "Hợp đồng dịch vụ được ký kết giữa EventBox (bên cung cấp nền tảng) và Ban tổ chức (bên đăng tải và vận hành sự kiện).",
  },
  {
    title: "2. Phạm vi dịch vụ",
    text: "EventBox cung cấp nền tảng đăng tải sự kiện, bán vé trực tuyến, thu hộ và đối soát doanh thu theo các điều khoản hiện hành.",
  },
  {
    title: "3. Trách nhiệm Ban tổ chức",
    text: "Ban tổ chức cam kết cung cấp thông tin sự kiện chính xác, tổ chức đúng như công bố và tuân thủ quy định pháp luật cũng như chính sách nội dung của EventBox.",
  },
  {
    title: "4. Thanh toán & đối soát",
    text: "Doanh thu bán vé được đối soát và chuyển cho Ban tổ chức sau khi trừ phí dịch vụ, theo lịch và tài khoản khai báo ở bước Thông tin thanh toán.",
  },
  {
    title: "5. Hủy & hoàn tiền",
    text: "Trường hợp sự kiện bị hủy hoặc thay đổi, Ban tổ chức chịu trách nhiệm hoàn tiền cho người tham gia theo chính sách hoàn vé của EventBox.",
  },
]

/**
 * Step 4 — service contract. Shows the agreement clauses and the official
 * organizer documents, then captures the representative name and a required
 * acceptance before the organizer can continue to payment info.
 */
export function ContractStep({ form, update }: ContractStepProps) {
  return (
    <div className={pageStyles.form}>
      {/* ── Contract clauses ───────────────────────────────────────── */}
      <SectionCard title="Hợp đồng dịch vụ với EventBox" icon={FileText}>
        <p className={styles.intro}>
          Vui lòng đọc kỹ các điều khoản hợp đồng dịch vụ dưới đây trước khi tiếp
          tục. Việc tiếp tục đồng nghĩa Ban tổ chức chấp nhận toàn bộ điều khoản.
        </p>
        <div className={styles.contractBox} tabIndex={0}>
          {CONTRACT_CLAUSES.map((clause) => (
            <div key={clause.title}>
              <h4 className={styles.clauseTitle}>{clause.title}</h4>
              <p className={styles.clauseText}>{clause.text}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Official documents ─────────────────────────────────────── */}
      <SectionCard title="Tài liệu & quy định đính kèm">
        <div className={styles.docList}>
          {ORGANIZER_TERMS.map((term) => (
            <a
              key={term.id}
              href={term.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docLink}
            >
              <FileText size={18} className={styles.docIcon} aria-hidden="true" />
              {term.title}
              <ExternalLink size={16} className={styles.docExternal} aria-hidden="true" />
            </a>
          ))}
        </div>
      </SectionCard>

      {/* ── Signer + acceptance ────────────────────────────────────── */}
      <SectionCard title="Xác nhận & đồng ý" required>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="contract-rep">
            <span className={formStyles.required} aria-hidden="true">*</span>
            Người đại diện Ban tổ chức
          </label>
          <input
            id="contract-rep"
            className={formStyles.input}
            type="text"
            style={{ paddingRight: "1rem" }}
            placeholder="Họ và tên người đại diện ký kết"
            value={form.contractRepName}
            onChange={(e) => update({ contractRepName: e.target.value })}
            autoComplete="name"
          />
        </div>

        <label className={cn(styles.agreeRow, form.contractAgreed && styles.agreeRowActive)}>
          <input
            type="checkbox"
            className={styles.agreeCheckbox}
            checked={form.contractAgreed}
            onChange={(e) => update({ contractAgreed: e.target.checked })}
          />
          <span className={styles.agreeText}>
            Tôi là người đại diện hợp pháp của Ban tổ chức và{" "}
            <strong>đã đọc, hiểu và đồng ý</strong> với toàn bộ điều khoản hợp đồng
            dịch vụ của EventBox.
          </span>
        </label>
      </SectionCard>
    </div>
  )
}
