"use client"

import { useRef } from "react"
import { Inbox, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionCard } from "./SectionCard"
import { FieldError } from "./FieldError"
import { LIMITS, type CreateEventForm } from "./create-event-data"
import type { Step1FieldKey } from "./wizard-validation"
import form from "./create-event-form.module.css"
import styles from "./OrganizerInfo.module.css"

interface OrganizerInfoProps {
  data: CreateEventForm
  update: (patch: Partial<CreateEventForm>) => void
  /** Per-field validation messages to show inline (already filtered by touched). */
  errors?: Partial<Record<Step1FieldKey, string>>
  /** Marks a field as touched (blurred) so its error can surface. */
  onBlur?: (key: Step1FieldKey) => void
}

/** Organizer identity card: logo, name and description. */
export function OrganizerInfo({ data, update, errors, onBlur }: OrganizerInfoProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const pick = () => inputRef.current?.click()
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (data.orgLogo) URL.revokeObjectURL(data.orgLogo)
    update({ orgLogo: URL.createObjectURL(file) })
  }
  const remove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.orgLogo) URL.revokeObjectURL(data.orgLogo)
    update({ orgLogo: null })
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <SectionCard>
      <div className={styles.row}>
        <div
          className={styles.logo}
          role="button"
          tabIndex={0}
          aria-label="Thêm logo ban tổ chức (275x275)"
          onClick={pick}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick())}
        >
          {data.orgLogo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.orgLogo} alt="Logo ban tổ chức" className={styles.preview} />
              <button type="button" className={styles.removeBtn} onClick={remove} aria-label="Xóa logo">
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <span className={styles.logoIcon}>
                <Inbox size={26} aria-hidden="true" />
              </span>
              <span className={styles.logoText}>Thêm logo ban tổ chức</span>
              <span className={styles.logoDim}>(275x275)</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className={styles.hidden}
            onChange={onFile}
          />
        </div>

        <div className={styles.fields}>
          <div className={form.field}>
            <label className={form.label} htmlFor="org-name">
              <span className={form.required} aria-hidden="true">*</span>
              Tên ban tổ chức
            </label>
            <div className={form.inputWrap}>
              <input
                id="org-name"
                className={cn(form.input, errors?.orgName && form.inputError)}
                type="text"
                maxLength={LIMITS.orgName}
                placeholder="Tên ban tổ chức"
                aria-required="true"
                aria-invalid={!!errors?.orgName || undefined}
                aria-describedby={errors?.orgName ? "err-org-name" : undefined}
                value={data.orgName}
                onChange={(e) => update({ orgName: e.target.value })}
                onBlur={() => onBlur?.("orgName")}
              />
              <span className={form.counter}>
                {data.orgName.length} / {LIMITS.orgName}
              </span>
            </div>
            <FieldError id="err-org-name" msg={errors?.orgName} />
          </div>

          <div className={form.field}>
            <label className={form.label} htmlFor="org-info">
              <span className={form.required} aria-hidden="true">*</span>
              Thông tin ban tổ chức
            </label>
            <textarea
              id="org-info"
              className={cn(form.textarea, errors?.orgInfo && form.inputError)}
              maxLength={LIMITS.orgInfo}
              placeholder="Thông tin ban tổ chức"
              aria-required="true"
              aria-invalid={!!errors?.orgInfo || undefined}
              aria-describedby={errors?.orgInfo ? "err-org-info" : undefined}
              value={data.orgInfo}
              onChange={(e) => update({ orgInfo: e.target.value })}
              onBlur={() => onBlur?.("orgInfo")}
            />
            <div className={form.counterBlock}>
              {data.orgInfo.length} / {LIMITS.orgInfo}
            </div>
            <FieldError id="err-org-info" msg={errors?.orgInfo} />
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
