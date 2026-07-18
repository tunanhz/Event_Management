"use client"

import { FileText, ExternalLink, FileDown, PenLine } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionCard } from "./SectionCard"
import { FieldError } from "./FieldError"
import { ORGANIZER_TERMS } from "../terms-data"
import { ContractDocument } from "./ContractDocument"
import { SignaturePad } from "./SignaturePad"
import type { CreateEventForm } from "./create-event-data"
import type { Step5FieldKey } from "./wizard-validation"
import formStyles from "./create-event-form.module.css"
import styles from "./contract-step.module.css"
import pageStyles from "@/app/organizer/create-event/create-event.module.css"

interface ContractStepProps {
  form: CreateEventForm
  update: (patch: Partial<CreateEventForm>) => void
  /** Inline validation messages (already filtered by touched). */
  errors?: Partial<Record<Step5FieldKey, string>>
  /** Marks a field as touched so its error can surface without a save press. */
  onBlur?: (key: Step5FieldKey) => void
}

/**
 * Step 5 — service contract. Renders the agreement as an A4 "paper" that can
 * be saved as PDF (browser print of just the document), then captures the
 * representative name and a hand-drawn signature. The acceptance checkbox
 * only unlocks after signing — mirrored by the backend rule (agreed ⇒
 * signatureUrl required).
 */
export function ContractStep({ form, update, errors, onBlur }: ContractStepProps) {
  const canAgree = !!form.signatureDataUrl && !!form.contractRepName.trim()

  const onSignature = (dataUrl: string | null) => {
    onBlur?.("signature")
    // Clearing the signature also revokes a previously ticked acceptance.
    update({ signatureDataUrl: dataUrl, ...(dataUrl ? {} : { contractAgreed: false }) })
  }

  // The print stylesheet only fires under body.print-contract, so printing
  // any other page of the app stays untouched.
  const printContract = () => {
    const cleanup = () => {
      document.body.classList.remove("print-contract")
      window.removeEventListener("afterprint", cleanup)
    }
    document.body.classList.add("print-contract")
    window.addEventListener("afterprint", cleanup)
    window.print()
    // Fallback for browsers where afterprint is unreliable.
    setTimeout(cleanup, 2000)
  }

  return (
    <div className={pageStyles.form}>
      {/* ── Contract document (print/PDF area) ─────────────────────── */}
      <SectionCard title="Hợp đồng dịch vụ với EventBox" icon={FileText}>
        <p className={styles.intro}>
          Vui lòng đọc kỹ hợp đồng dịch vụ dưới đây. Bạn có thể tải bản PDF để
          lưu trữ; chữ ký ở mục xác nhận sẽ hiển thị trực tiếp trên hợp đồng.
        </p>
        <div className={styles.paperActions}>
          <button type="button" className={styles.pdfBtn} onClick={printContract}>
            <FileDown size={16} aria-hidden="true" />
            Tải hợp đồng (PDF)
          </button>
        </div>
        <div className={styles.paperScroll}>
          <ContractDocument form={form} />
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

      {/* ── Signer + digital signature + acceptance ────────────────── */}
      <SectionCard title="Xác nhận & ký hợp đồng" required>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="contract-rep">
            <span className={formStyles.required} aria-hidden="true">*</span>
            Người đại diện Ban tổ chức
          </label>
          <input
            id="contract-rep"
            className={cn(formStyles.input, errors?.contractRepName && formStyles.inputError)}
            type="text"
            style={{ paddingRight: "1rem" }}
            placeholder="Họ và tên người đại diện ký kết"
            value={form.contractRepName}
            onChange={(e) => {
              update({ contractRepName: e.target.value })
              onBlur?.("contractRepName")
            }}
            onBlur={() => onBlur?.("contractRepName")}
            autoComplete="name"
            aria-required="true"
            aria-invalid={!!errors?.contractRepName || undefined}
            aria-describedby={errors?.contractRepName ? "err-contract-rep" : undefined}
          />
          <FieldError id="err-contract-rep" msg={errors?.contractRepName} />
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label}>
            <span className={formStyles.required} aria-hidden="true">*</span>
            Chữ ký người đại diện
          </label>
          <SignaturePad value={form.signatureDataUrl} onChange={onSignature} />
          <p className={styles.sigStatus} aria-live="polite">
            {form.signatureDataUrl ? (
              <span className={styles.sigStatusSigned}>
                ✓ Đã ký — chữ ký sẽ được lưu kèm hợp đồng khi bạn lưu sự kiện.
              </span>
            ) : (
              <>
                <PenLine size={14} aria-hidden="true" /> Vẽ chữ ký bằng chuột
                hoặc cảm ứng để mở khóa ô đồng ý bên dưới.
              </>
            )}
          </p>
          <FieldError msg={errors?.signature} />
        </div>

        <label
          className={cn(
            styles.agreeRow,
            form.contractAgreed && styles.agreeRowActive
          )}
        >
          <input
            type="checkbox"
            className={styles.agreeCheckbox}
            checked={form.contractAgreed}
            disabled={!canAgree}
            onChange={(e) => {
              onBlur?.("agreed")
              update({ contractAgreed: e.target.checked })
            }}
          />
          <span className={styles.agreeText}>
            Tôi là người đại diện hợp pháp của Ban tổ chức, <strong>đã ký tên</strong>{" "}
            và <strong>đồng ý</strong> với toàn bộ điều khoản hợp đồng dịch vụ của
            EventBox.
          </span>
        </label>
        <FieldError msg={errors?.agreed} />
      </SectionCard>
    </div>
  )
}
