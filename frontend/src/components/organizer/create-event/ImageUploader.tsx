"use client"

import { useId, useRef } from "react"
import { Inbox, X } from "lucide-react"
import { SectionCard } from "./SectionCard"
import styles from "./ImageUploader.module.css"

interface ImageUploaderProps {
  poster: string | null
  banner: string | null
  onPosterChange: (url: string | null) => void
  onBannerChange: (url: string | null) => void
}

/** Two upload dropzones (portrait poster + landscape banner) in one card. */
export function ImageUploader({
  poster,
  banner,
  onPosterChange,
  onBannerChange,
}: ImageUploaderProps) {
  return (
    <SectionCard
      title="Upload hình ảnh"
      required
      action={{ label: "Xem vị trí hiển thị các ảnh" }}
    >
      <div className={styles.grid}>
        <Dropzone
          label={"Thêm ảnh sự kiện để\nhiển thị ở các vị trí khác"}
          dimension="(720x958)"
          value={poster}
          onChange={onPosterChange}
        />
        <Dropzone
          label="Thêm ảnh nền sự kiện"
          dimension="(1280x720)"
          value={banner}
          onChange={onBannerChange}
        />
      </div>
    </SectionCard>
  )
}

interface DropzoneProps {
  label: string
  dimension: string
  value: string | null
  onChange: (url: string | null) => void
}

function Dropzone({ label, dimension, value, onChange }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const pick = () => inputRef.current?.click()

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (value) URL.revokeObjectURL(value)
    onChange(URL.createObjectURL(file))
  }

  const remove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (value) URL.revokeObjectURL(value)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div
      className={styles.zone}
      role="button"
      tabIndex={0}
      aria-label={`${label.replace(/\n/g, " ")} ${dimension}`}
      onClick={pick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick())}
    >
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Xem trước ảnh đã tải lên" className={styles.preview} />
          <button
            type="button"
            className={styles.removeBtn}
            onClick={remove}
            aria-label="Xóa ảnh"
          >
            <X size={18} />
          </button>
        </>
      ) : (
        <>
          <span className={styles.icon}>
            <Inbox size={30} aria-hidden="true" />
          </span>
          <span className={styles.zoneText} style={{ whiteSpace: "pre-line" }}>
            {label}
          </span>
          <span className={styles.zoneDim}>{dimension}</span>
        </>
      )}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.hidden}
        onChange={onFile}
      />
    </div>
  )
}
