"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  UploadCloud,
  FileText,
  Trash2,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PERMIT_FILE_RULES } from "../create-event/create-event-data"
import {
  fetchPermits,
  configurePermits,
  uploadPermitFile,
  type PermitDoc,
} from "./organizer-permits-api"
import tableStyles from "../checkin/checkin.module.css"
import styles from "./permits.module.css"

interface PermitSubmissionViewProps {
  eventId: string
  /** Backend review state — permits are editable only while DRAFT/REJECTED. */
  reviewStatus?: string
  /** Called after a successful save so the shared workspace context (read by
   *  sibling tabs like "Chỉnh sửa") refetches instead of serving what it
   *  loaded on its own first mount. */
  onSaved?: () => void
}

/**
 * Dedicated "Giấy phép & Hồ sơ pháp lý" screen (EM-28). Loads the permit list
 * from GET /permits, uploads new files to /api/uploads/permits, and saves the
 * whole list back via PUT /permits — the standalone counterpart to uploading
 * permits inside the create-event wizard.
 */
export function PermitSubmissionView({ eventId, reviewStatus, onSaved }: PermitSubmissionViewProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<PermitDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const editable = reviewStatus === "DRAFT" || reviewStatus === "REJECTED"

  // Reusable loader for the "Tải lại" button (safe to call from event handlers).
  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchPermits(eventId)
      .then(setDocs)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được hồ sơ giấy phép"))
      .finally(() => setLoading(false))
  }, [eventId])

  // Initial load — abort-guarded so a fast event switch can't apply stale data.
  // Kept inline (not `load`) so no setState runs synchronously in the effect body.
  useEffect(() => {
    let active = true
    fetchPermits(eventId)
      .then((list) => {
        if (active) {
          setDocs(list)
          setError(null)
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Không tải được hồ sơ giấy phép")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [eventId])

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setSuccess(null)
    const errors: string[] = []
    const accepted: PermitDoc[] = []

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
      if (!(PERMIT_FILE_RULES.allowedExtensions as readonly string[]).includes(ext)) {
        errors.push(`“${file.name}”: chỉ chấp nhận PDF, DOCX hoặc PNG.`)
        continue
      }
      if (file.size > PERMIT_FILE_RULES.maxSizeMb * 1024 * 1024) {
        errors.push(`“${file.name}”: vượt quá ${PERMIT_FILE_RULES.maxSizeMb}MB.`)
        continue
      }
      if (docs.some((d) => d.name === file.name) || accepted.some((d) => d.name === file.name)) {
        errors.push(`“${file.name}”: tệp đã có trong danh sách.`)
        continue
      }
      try {
        accepted.push(await uploadPermitFile(file))
      } catch (e) {
        errors.push(`“${file.name}”: ${e instanceof Error ? e.message : "tải lên thất bại"}.`)
      }
    }

    if (accepted.length > 0) setDocs((prev) => [...prev, ...accepted])
    setError(errors.length > 0 ? errors.join(" ") : null)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  const removeDoc = (url: string) => {
    setDocs((prev) => prev.filter((d) => d.url !== url))
    setSuccess(null)
  }

  const save = async () => {
    setError(null)
    setSuccess(null)
    // Permits are mandatory — refuse to save an empty list so the organizer
    // can't end up with a permit-less event that the submit gate will reject.
    if (docs.length === 0) {
      setError("Cần đính kèm ít nhất 1 giấy phép / hồ sơ pháp lý.")
      return
    }
    setSaving(true)
    try {
      const saved = await configurePermits(eventId, docs)
      setDocs(saved)
      setSuccess(
        saved.length === 0
          ? "Đã lưu — danh sách giấy phép hiện đang trống."
          : `Đã lưu ${saved.length} tài liệu giấy phép.`
      )
      onSaved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu hồ sơ giấy phép thất bại")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className={tableStyles.pageHeading}>Giấy phép & Hồ sơ pháp lý</h1>
      <p className={styles.intro}>
        Đính kèm giấy phép tổ chức, sơ đồ sự kiện và các tài liệu pháp lý để Admin thẩm định khi
        duyệt sự kiện. Định dạng PDF, DOCX, PNG — tối đa {PERMIT_FILE_RULES.maxSizeMb}MB mỗi tệp.
        Cần ít nhất 1 giấy phép thì mới gửi duyệt được sự kiện.
      </p>

      {!editable && (
        <div className={cn(styles.notice, styles.noticeWarn)} role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            Hồ sơ giấy phép chỉ chỉnh sửa được khi sự kiện ở trạng thái <b>Nháp</b> hoặc{" "}
            <b>Bị từ chối</b>.{reviewStatus ? ` Hiện tại: ${reviewStatus}.` : ""} Bạn vẫn có thể xem
            danh sách bên dưới.
          </span>
        </div>
      )}

      {loading ? (
        <p className={styles.muted}>Đang tải hồ sơ giấy phép…</p>
      ) : (
        <>
          {editable && (
            <>
              <button
                type="button"
                className={styles.dropzone}
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <UploadCloud size={28} aria-hidden="true" />
                <span>{uploading ? "Đang tải lên…" : "Nhấn để chọn tệp từ máy của bạn"}</span>
                <span className={styles.dropzoneHint}>
                  PDF, DOCX, PNG · ≤ {PERMIT_FILE_RULES.maxSizeMb}MB
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={PERMIT_FILE_RULES.accept}
                multiple
                hidden
                onChange={(e) => addFiles(e.target.files)}
              />
            </>
          )}

          {docs.length > 0 ? (
            <ul className={styles.fileList}>
              {docs.map((doc) => (
                <li key={doc.url} className={styles.fileRow}>
                  <FileText size={18} className={styles.fileIcon} aria-hidden="true" />
                  <a href={doc.url} target="_blank" rel="noreferrer" className={styles.fileName}>
                    {doc.name}
                  </a>
                  {doc.sizeKb ? (
                    <span className={styles.fileMeta}>{doc.sizeKb.toLocaleString("vi-VN")} KB</span>
                  ) : (
                    <span className={styles.fileMeta} />
                  )}
                  {editable && (
                    <button
                      type="button"
                      className={styles.fileRemove}
                      aria-label={`Xoá tệp ${doc.name}`}
                      onClick={() => removeDoc(doc.url)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Chưa có tài liệu giấy phép nào.</p>
          )}

          {error && (
            <p role="alert" className={cn(styles.notice, styles.noticeError)}>
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
          {success && (
            <p role="status" className={cn(styles.notice, styles.noticeOk)}>
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>{success}</span>
            </p>
          )}

          {editable && (
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={load} disabled={saving || uploading}>
                <RefreshCw size={16} aria-hidden="true" /> Tải lại
              </button>
              <button type="button" className={styles.primaryBtn} onClick={save} disabled={saving || uploading}>
                <Save size={16} aria-hidden="true" /> {saving ? "Đang lưu…" : "Lưu hồ sơ giấy phép"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
