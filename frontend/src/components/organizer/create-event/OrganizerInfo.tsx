"use client"

import { useRef } from "react"
import { Inbox, X } from "lucide-react"
import { SectionCard } from "./SectionCard"
import { LIMITS, type CreateEventForm } from "./create-event-data"
import form from "./create-event-form.module.css"
import styles from "./OrganizerInfo.module.css"

interface OrganizerInfoProps {
  data: CreateEventForm
  update: (patch: Partial<CreateEventForm>) => void
}

/** Organizer identity card: logo, name and description. */
export function OrganizerInfo({ data, update }: OrganizerInfoProps) {
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
            <label className={form.label}>
              <span className={form.required} aria-hidden="true">*</span>
              Tên ban tổ chức
            </label>
            <div className={form.inputWrap}>
              <input
                className={form.input}
                type="text"
                maxLength={LIMITS.orgName}
                placeholder="Tên ban tổ chức"
                aria-label="Tên ban tổ chức"
                value={data.orgName}
                onChange={(e) => update({ orgName: e.target.value })}
              />
              <span className={form.counter}>
                {data.orgName.length} / {LIMITS.orgName}
              </span>
            </div>
          </div>

          <div className={form.field}>
            <label className={form.label}>
              <span className={form.required} aria-hidden="true">*</span>
              Thông tin ban tổ chức
            </label>
            <textarea
              className={form.textarea}
              maxLength={LIMITS.orgInfo}
              placeholder="Thông tin ban tổ chức"
              aria-label="Thông tin ban tổ chức"
              value={data.orgInfo}
              onChange={(e) => update({ orgInfo: e.target.value })}
            />
            <div className={form.counterBlock}>
              {data.orgInfo.length} / {LIMITS.orgInfo}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
