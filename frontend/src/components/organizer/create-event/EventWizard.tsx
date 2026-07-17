"use client"

import { useEffect, useRef, useState } from "react"
import { StepTabs } from "./StepTabs"
import { saveEventDraft } from "./organizer-event-api"
import { ImageUploader } from "./ImageUploader"
import { EventBasicInfo } from "./EventBasicInfo"
import { RichTextEditor } from "./RichTextEditor"
import { OrganizerInfo } from "./OrganizerInfo"
import { SectionCard } from "./SectionCard"
import { TimeAndTicketsStep } from "./TimeAndTicketsStep"
import { SettingsStep } from "./SettingsStep"
import { LogisticsPermitStep } from "./LogisticsPermitStep"
import { ContractStep } from "./ContractStep"
import { PaymentStep } from "./PaymentStep"
import {
  WIZARD_STEPS,
  type CreateEventForm,
  type WizardStep,
} from "./create-event-data"
import { firstInvalidStep, validateStep, fieldErrors, type Step1FieldKey } from "./wizard-validation"
import styles from "@/app/organizer/create-event/create-event.module.css"

/**
 * Reusable event form wizard. Seeded from `initialForm` so it powers both the
 * "Tạo sự kiện" (empty) and "Chỉnh sửa" (pre-filled) flows.
 */
export function EventWizard({
  initialForm,
  eventId: initialEventId,
  readOnly = false,
  onSaved,
}: {
  initialForm: CreateEventForm
  /** Existing event id (edit flow) — seeds saves to PUT (update) this event
   *  instead of POSTing a new one. Absent for the "Tạo sự kiện" create flow. */
  eventId?: string
  /** View-only lock (PENDING_REVIEW): renders the filled form but disables every
   *  field and hides Save/Continue, so an in-review event can be reviewed not edited. */
  readOnly?: boolean
  /** Called after a successful save (edit flow only — the create flow has no
   *  shared workspace context to refresh). Lets sibling tabs (Lịch trình,
   *  Tổng kết, …) pick up the change instead of serving stale first-load data. */
  onSaved?: () => void
}) {
  const [step, setStep] = useState<WizardStep>(1)
  const [form, setForm] = useState<CreateEventForm>(initialForm)
  // Seeded from an existing event in the edit flow; otherwise set after the
  // first successful save so later saves PUT the same draft.
  const [eventId, setEventId] = useState<string | null>(initialEventId ?? null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  // Validation errors for the step the organizer is currently blocked on.
  const [stepErrors, setStepErrors] = useState<string[]>([])
  // Move focus to the error summary when a step fails validation so keyboard /
  // screen-reader users are taken straight to what needs fixing.
  const errorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (stepErrors.length > 0) errorRef.current?.focus()
  }, [stepErrors])

  // Inline (per-field) validation for step 1. A field's error shows once it has
  // been blurred (touched) or after a failed "Tiếp tục"/"Lưu" reveals them all.
  const [touched, setTouched] = useState<Partial<Record<Step1FieldKey, boolean>>>({})
  const [revealFieldErrors, setRevealFieldErrors] = useState(false)
  const markTouched = (key: Step1FieldKey) =>
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }))

  const shownFieldErrors = (() => {
    const all = fieldErrors(form)
    const out: Partial<Record<Step1FieldKey, string>> = {}
    for (const key of Object.keys(all) as Step1FieldKey[]) {
      if (revealFieldErrors || touched[key]) out[key] = all[key]
    }
    return out
  })()

  // Furthest step the organizer may open: up to (and including) the first
  // incomplete step. Everything beyond stays locked until earlier steps pass.
  // Read-only view unlocks every tab so the whole event can be browsed.
  const maxStep: WizardStep = readOnly ? 6 : firstInvalidStep(form) ?? 6

  // Steps may pass either a plain patch or an updater reading the latest form
  // (needed by async flows like the permit upload, which must not clobber
  // edits made while an await was in flight).
  const update = (
    patch: Partial<CreateEventForm> | ((prev: CreateEventForm) => Partial<CreateEventForm>)
  ) =>
    setForm((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }))

  // Advance only when the current step is complete; otherwise surface its errors.
  const goNext = () => {
    const errs = validateStep(step, form)
    setStepErrors(errs)
    if (errs.length === 0) {
      setRevealFieldErrors(false)
      setStep((s) => Math.min(s + 1, WIZARD_STEPS.length) as WizardStep)
    } else {
      // Reveal every invalid field on the current step, not just blurred ones.
      setRevealFieldErrors(true)
    }
  }

  // Tab clicks: free to go back; forward only up to the first incomplete step.
  const goToStep = (target: WizardStep) => {
    if (target <= step) {
      setStepErrors([])
      setStep(target)
      return
    }
    const blocker = firstInvalidStep(form)
    if (blocker && blocker < target) {
      setStep(blocker)
      setStepErrors(validateStep(blocker, form))
    } else {
      setStepErrors([])
      setStep(target)
    }
  }

  /** Validate every step, then upload assets, map to the payload and save. */
  const save = async () => {
    if (saving || readOnly) return
    const blocker = firstInvalidStep(form)
    if (blocker) {
      setStep(blocker)
      setStepErrors(validateStep(blocker, form))
      setRevealFieldErrors(true)
      setSaveMsg({ type: "err", text: "Vui lòng hoàn tất tất cả các bước trước khi lưu." })
      return
    }
    setStepErrors([])
    setSaving(true)
    setSaveMsg(null)
    try {
      const result = await saveEventDraft(form, eventId ?? undefined)
      setEventId(result.eventId)
      setForm((prev) => ({
        ...prev,
        // Stored /uploads URLs replace blob:/data: previews → no re-upload.
        ...result.assetPatch,
        // Adopt server show ids (matched by FE id, robust against blank rows
        // and edits made while the save was in flight) so re-saves update
        // instead of recreating shows.
        shows: prev.shows.map((s) => {
          const match = result.showIdMap.find((m) => m.feShowId === s.id)
          return match ? { ...s, id: match.serverId } : s
        }),
      }))
      setSaveMsg({
        type: "ok",
        text: "Đã lưu nháp sự kiện thành công. Bạn có thể tiếp tục chỉnh sửa hoặc gửi duyệt từ trang quản lý.",
      })
      onSaved?.()
    } catch (err) {
      setSaveMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Lưu sự kiện thất bại — vui lòng thử lại.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <StepTabs
        current={step}
        maxStep={maxStep}
        onSelect={goToStep}
        onSave={save}
        onNext={goNext}
        saving={saving}
        readOnly={readOnly}
      />

      {readOnly && (
        <p role="status" className={styles.saveBanner}>
          Sự kiện đang chờ duyệt — bạn chỉ có thể xem lại thông tin đã gửi, không thể chỉnh sửa.
        </p>
      )}

      {saveMsg && (
        <p
          role="status"
          className={`${styles.saveBanner} ${
            saveMsg.type === "ok" ? styles.saveBannerOk : styles.saveBannerErr
          }`}
        >
          {saving ? "Đang lưu…" : saveMsg.text}
        </p>
      )}
      {saving && !saveMsg && (
        <p role="status" className={styles.saveBanner}>
          Đang tải ảnh & lưu sự kiện…
        </p>
      )}

      {stepErrors.length > 0 && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className={`${styles.saveBanner} ${styles.saveBannerErr}`}
        >
          <strong>Vui lòng hoàn tất bước này trước khi tiếp tục:</strong>
          <ul className={styles.errorList}>
            {stepErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Read-only lock: a disabled fieldset neutralizes native inputs; the
          pointer-events guard also covers the custom controls (rich text,
          image upload, ticket modals). */}
      <fieldset
        disabled={readOnly}
        style={{
          border: 0,
          margin: 0,
          padding: 0,
          minInlineSize: 0,
          ...(readOnly ? { pointerEvents: "none", opacity: 0.7 } : {}),
        }}
      >
      <div id="wizard-panel" role="tabpanel" aria-labelledby={`wizard-tab-${step}`}>
      {step === 1 && (
        <div className={styles.form}>
          <ImageUploader
            poster={form.posterImage}
            banner={form.bannerImage}
            onPosterChange={(url) => update({ posterImage: url })}
            onBannerChange={(url) => update({ bannerImage: url })}
          />

          <EventBasicInfo
            form={form}
            update={update}
            errors={shownFieldErrors}
            onBlur={markTouched}
          />

          <SectionCard title="Thông tin sự kiện" required>
            <RichTextEditor
              initialHTML={form.description}
              onChange={(html) => update({ description: html })}
            />
          </SectionCard>

          <OrganizerInfo
            data={form}
            update={update}
            errors={shownFieldErrors}
            onBlur={markTouched}
          />
        </div>
      )}

      {step === 2 && <TimeAndTicketsStep form={form} update={update} />}

      {step === 3 && <SettingsStep form={form} update={update} />}

      {step === 4 && <LogisticsPermitStep form={form} update={update} />}

      {step === 5 && <ContractStep form={form} update={update} />}

      {step === 6 && <PaymentStep form={form} update={update} />}
      </div>
      </fieldset>
    </div>
  )
}
