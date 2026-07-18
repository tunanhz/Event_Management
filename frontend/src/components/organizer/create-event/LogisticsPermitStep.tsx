"use client"

import { useRef, useState } from "react"
import { FileText, Trash2, UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionCard } from "./SectionCard"
import { FieldError } from "./FieldError"
import {
  LOGISTICS_SERVICES,
  PERMIT_FILE_RULES,
  type CreateEventForm,
  type PermitDocument,
} from "./create-event-data"
import type { Step4FieldKey } from "./wizard-validation"
import styles from "./logistics-step.module.css"
import pageStyles from "@/app/organizer/create-event/create-event.module.css"

interface LogisticsPermitStepProps {
  form: CreateEventForm
  update: (
    patch: Partial<CreateEventForm> | ((prev: CreateEventForm) => Partial<CreateEventForm>)
  ) => void
  /** Inline validation messages (already filtered by touched). */
  errors?: Partial<Record<Step4FieldKey, string>>
  /** Marks the permit upload as touched so the "≥ 1 file" error can surface. */
  onTouch?: () => void
}

/**
 * Step 4 — logistics support services + legal permit upload.
 * Files are validated client-side (PDF/DOCX/PNG, ≤ 15MB) then uploaded
 * immediately to /api/uploads/permits; the form keeps the returned URL so the
 * save call only ships metadata.
 */
export function LogisticsPermitStep({ form, update, errors, onTouch }: LogisticsPermitStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const getOtherServiceValue = () => {
    const item = form.logisticsServices.find((s) => s.startsWith("khac:"))
    return item ? item.substring(5) : ""
  }

  const handleOtherServiceChange = (val: string) => {
    const withoutOther = form.logisticsServices.filter((s) => !s.startsWith("khac:"))
    update({ logisticsServices: [...withoutOther, `khac:${val}`] })
  }

  const toggleService = (id: string) => {
    if (id === "khac") {
      const hasOther = form.logisticsServices.some((s) => s.startsWith("khac:"))
      if (hasOther) {
        update({ logisticsServices: form.logisticsServices.filter((s) => !s.startsWith("khac:")) })
      } else {
        update({ logisticsServices: [...form.logisticsServices, "khac:"] })
      }
      return
    }

    const next = form.logisticsServices.includes(id)
      ? form.logisticsServices.filter((s) => s !== id)
      : [...form.logisticsServices, id]
    update({ logisticsServices: next })
  }

  const addFiles = async (files: FileList | null) => {
    onTouch?.()
    if (!files || files.length === 0) return
    const errors: string[] = []
    const accepted: PermitDocument[] = []
    setUploading(true)

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
      // Upload ngay khi chọn — form chỉ giữ metadata + URL đã lưu trên server.
      try {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/uploads/permits", {
          method: "POST",
          body: formData,
          credentials: "include",
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.data?.url) {
          throw new Error(json?.message || "tải lên thất bại")
        }
        accepted.push({
          id: `doc-${file.name}-${file.size}`,
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          url: json.data.url,
        })
      } catch (err) {
        errors.push(
          `“${file.name}”: ${err instanceof Error ? err.message : "tải lên thất bại"}.`
        )
      }
    }

    if (accepted.length > 0) {
      update((prev) => ({ permitDocuments: [...prev.permitDocuments, ...accepted] }))
    }
    setUploadError(errors.length > 0 ? errors.join(" ") : null)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  const removeFile = (id: string) => {
    onTouch?.()
    update({ permitDocuments: form.permitDocuments.filter((d) => d.id !== id) })
  }

  return (
    <div className={pageStyles.form}>
      {/* ── Platform support services ─────────────────────────────── */}
      <SectionCard title="Dịch vụ">
        <p className={styles.intro}>
          Chọn các hạng mục dịch vụ Ban tổ chức muốn thuê từ nền tảng. Đội ngũ vận hành sẽ
          liên hệ báo giá sau khi nhận hồ sơ sự kiện.
        </p>
        <div className={styles.serviceList}>
          {LOGISTICS_SERVICES.map((service) => {
            const checked = service.id === "khac"
              ? form.logisticsServices.some((s) => s.startsWith("khac:"))
              : form.logisticsServices.includes(service.id)
            return (
              <div key={service.id} className="flex flex-col gap-2">
                <label
                  className={cn(styles.serviceRow, checked && styles.serviceRowActive)}
                >
                  <input
                    type="checkbox"
                    className={styles.serviceCheckbox}
                    checked={checked}
                    onChange={() => toggleService(service.id)}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className={styles.serviceLabel}>{service.label}</span>
                    <span className={styles.serviceDesc}>{service.description}</span>
                  </span>
                </label>
                {service.id === "khac" && checked && (
                  <input
                    type="text"
                    value={getOtherServiceValue()}
                    onChange={(e) => handleOtherServiceChange(e.target.value)}
                    className="block w-full rounded-xl border border-input bg-card py-2 px-3 text-sm text-foreground focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                    placeholder="Vui lòng nhập yêu cầu dịch vụ khác..."
                  />
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* ── Legal permit upload ───────────────────────────────────── */}
      <SectionCard title="Giấy phép & Sơ đồ sự kiện" required>
        <p className={styles.intro}>
          Đính kèm giấy phép tổ chức và sơ đồ sự kiện để Admin thẩm định. Định dạng PDF, DOCX, PNG — tối đa{" "}
          {PERMIT_FILE_RULES.maxSizeMb}MB mỗi tệp.
        </p>

        <button
          type="button"
          className={styles.dropzone}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ width: "100%" }}
        >
          <UploadCloud size={28} aria-hidden="true" />
          <span>{uploading ? "Đang tải lên…" : "Nhấn để chọn tệp từ máy của bạn"}</span>
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

        <FieldError msg={errors?.permitDocuments} />

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
