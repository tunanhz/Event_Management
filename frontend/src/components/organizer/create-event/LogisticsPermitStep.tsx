"use client"

import { useRef, useState } from "react"
import { FileText, Trash2, UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionCard } from "./SectionCard"
import {
  LOGISTICS_SERVICES,
  PERMIT_FILE_RULES,
  type CreateEventForm,
  type PermitDocument,
} from "./create-event-data"
import styles from "./logistics-step.module.css"
import pageStyles from "@/app/organizer/create-event/create-event.module.css"

interface LogisticsPermitStepProps {
  form: CreateEventForm
  update: (patch: Partial<CreateEventForm>) => void
}

/**
 * Step 4 — logistics support services + legal permit upload.
 * Files are validated client-side (PDF/DOCX/PNG, ≤ 15MB) but only metadata is
 * kept in the form — upload to backend is out of scope for this screen.
 */
export function LogisticsPermitStep({ form, update }: LogisticsPermitStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const toggleService = (id: string) => {
    const next = form.logisticsServices.includes(id)
      ? form.logisticsServices.filter((s) => s !== id)
      : [...form.logisticsServices, id]
    update({ logisticsServices: next })
  }

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const errors: string[] = []
    const accepted: PermitDocument[] = []

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
      if (!(PERMIT_FILE_RULES.allowedExtensions as readonly string[]).includes(ext)) {
        errors.push(`“${file.name}”: chỉ chấp nhận định dạng PDF, DOCX hoặc PNG.`)
        continue
      }
      if (file.size > PERMIT_FILE_RULES.maxSizeMb * 1024 * 1024) {
        errors.push(`“${file.name}”: vượt quá giới hạn ${PERMIT_FILE_RULES.maxSizeMb}MB.`)
        continue
      }
      if (form.permitDocuments.some((d) => d.name === file.name)) {
        errors.push(`“${file.name}”: tệp đã được thêm trước đó.`)
        continue
      }
      accepted.push({
        id: `doc-${file.name}-${file.size}`,
        name: file.name,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
      })
    }

    if (accepted.length > 0) {
      update({ permitDocuments: [...form.permitDocuments, ...accepted] })
    }
    setUploadError(errors.length > 0 ? errors.join(" ") : null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const removeFile = (id: string) =>
    update({ permitDocuments: form.permitDocuments.filter((d) => d.id !== id) })

  return (
    <div className={pageStyles.form}>
      {/* ── Platform support services ─────────────────────────────── */}
      <SectionCard title="Dịch vụ hỗ trợ từ nền tảng">
        <p className={styles.intro}>
          Chọn các dịch vụ Ban tổ chức muốn EventBox hỗ trợ. Đội ngũ vận hành sẽ
          liên hệ báo giá sau khi sự kiện được duyệt.
        </p>
        <div className={styles.serviceList}>
          {LOGISTICS_SERVICES.map((service) => {
            const checked = form.logisticsServices.includes(service.id)
            return (
              <label
                key={service.id}
                className={cn(styles.serviceRow, checked && styles.serviceRowActive)}
              >
                <input
                  type="checkbox"
                  className={styles.serviceCheckbox}
                  checked={checked}
                  onChange={() => toggleService(service.id)}
                />
                <span>
                  <span className={styles.serviceLabel}>{service.label}</span>
                  <span className={styles.serviceDesc}>{service.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </SectionCard>

      {/* ── Legal permit upload ───────────────────────────────────── */}
      <SectionCard title="Giấy phép & hồ sơ pháp lý" required>
        <p className={styles.intro}>
          Đính kèm giấy phép tổ chức, hợp đồng thuê địa điểm hoặc hồ sơ pháp lý
          liên quan để Admin thẩm định. Định dạng PDF, DOCX, PNG — tối đa{" "}
          {PERMIT_FILE_RULES.maxSizeMb}MB mỗi tệp.
        </p>

        <button
          type="button"
          className={styles.dropzone}
          onClick={() => inputRef.current?.click()}
          style={{ width: "100%" }}
        >
          <UploadCloud size={28} aria-hidden="true" />
          <span>Nhấn để chọn tệp từ máy của bạn</span>
          <span className={styles.dropzoneHint}>PDF, DOCX, PNG · ≤ {PERMIT_FILE_RULES.maxSizeMb}MB</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={PERMIT_FILE_RULES.accept}
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />

        {uploadError && (
          <p role="alert" className={styles.uploadError}>
            {uploadError}
          </p>
        )}

        {form.permitDocuments.length > 0 && (
          <ul className={styles.fileList}>
            {form.permitDocuments.map((doc) => (
              <li key={doc.id} className={styles.fileRow}>
                <FileText size={18} className={styles.fileIcon} aria-hidden="true" />
                <span className={styles.fileName}>{doc.name}</span>
                <span className={styles.fileMeta}>{doc.sizeKb.toLocaleString("vi-VN")} KB</span>
                <button
                  type="button"
                  className={styles.fileRemove}
                  aria-label={`Xóa tệp ${doc.name}`}
                  onClick={() => removeFile(doc.id)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
