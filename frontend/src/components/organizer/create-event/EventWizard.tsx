"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
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
import {
  firstInvalidStep,
  validateStep,
  fieldErrors,
  showFieldErrors,
  step3FieldErrors,
  step4FieldErrors,
  step5FieldErrors,
  step6FieldErrors,
  type ShowFieldKey,
} from "./wizard-validation"
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
  finishHref,
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
  /** Create flow only: where "Tiếp tục" on the last step navigates after saving
   *  the draft (e.g. "/organizer?tab=draft"). When unset (edit flow) the last
   *  step just saves in place without leaving the workspace. */
  finishHref?: string
}) {
  const router = useRouter()
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

  // Inline (per-field) validation across every step. A field's error shows red
  // as soon as it has been touched (changed/blurred) — no "Lưu"/"Tiếp tục" press
  // needed — or after a failed navigation reveals them all. Keys are unique
  // across steps (namespaced per show for step 2), so one Set covers the wizard.
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const [revealFieldErrors, setRevealFieldErrors] = useState(false)
  const markTouched = (key: string) =>
    setTouched((t) => (t.has(key) ? t : new Set(t).add(key)))
  const isShown = (key: string) => revealFieldErrors || touched.has(key)

  /** Keep only the errors whose field has been touched (or after reveal-all). */
  function filterShown<K extends string>(
    all: Partial<Record<K, string>>
  ): Partial<Record<K, string>> {
    const out: Partial<Record<K, string>> = {}
    for (const key of Object.keys(all) as K[]) if (isShown(key)) out[key] = all[key]
    return out
  }

  const shownFieldErrors = filterShown(fieldErrors(form))

  // Step 2 — per-show inline errors, keyed by show id. The "≥ 1 loại vé" error
  // surfaces once the organizer has touched that show's date fields (or reveal-all),
  // since a show's ticket list has no field of its own to blur.
  const shownShowErrors: Record<string, Partial<Record<ShowFieldKey, string>>> = {}
  form.shows.forEach((show, i) => {
    const all = showFieldErrors(show, form.shows[i - 1])
    const base = `show:${show.id}`
    const out: Partial<Record<ShowFieldKey, string>> = {}
    if (all.startTime && isShown(`${base}:startTime`)) out.startTime = all.startTime
    if (all.endTime && isShown(`${base}:endTime`)) out.endTime = all.endTime
    const showTouched =
      revealFieldErrors || touched.has(`${base}:startTime`) || touched.has(`${base}:endTime`)
    if (all.tickets && showTouched) out.tickets = all.tickets
    shownShowErrors[show.id] = out
  })

  const shownStep3 = filterShown(step3FieldErrors(form))
  const shownStep4 = filterShown(step4FieldErrors(form))
  const shownStep6 = filterShown(step6FieldErrors(form))

  // Step 5 — the signature/agreement have no text field to blur, so reveal them
  // once the organizer has started the contract section (touched any of its
  // controls) or after reveal-all.
  const step5All = step5FieldErrors(form)
  const contractStarted =
    revealFieldErrors ||
    touched.has("contractRepName") ||
    touched.has("signature") ||
    touched.has("agreed")
  const shownStep5: Partial<Record<"contractRepName" | "signature" | "agreed", string>> = {}
  if (step5All.contractRepName && isShown("contractRepName"))
    shownStep5.contractRepName = step5All.contractRepName
  if (step5All.signature && contractStarted) shownStep5.signature = step5All.signature
  if (step5All.agreed && contractStarted) shownStep5.agreed = step5All.agreed

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
  // On the final step "Tiếp tục" finishes the wizard instead of advancing: it
  // saves the draft and (create flow) leaves for the "Sự kiện của tôi" list.
  const goNext = () => {
    if (step === WIZARD_STEPS.length) {
      void finishWizard()
      return
    }
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

  // Last-step "Tiếp tục": persist the draft, then (create flow) navigate to the
  // organizer's event list so the freshly-saved draft is right there. A failed
  // save keeps the organizer on the wizard with the error surfaced.
  const finishWizard = async () => {
    const ok = await save()
    if (ok && finishHref) router.push(finishHref)
  }

  // Tab clicks: free to go back; forward only up to the first incomplete step.
  const goToStep = (target: WizardStep) => {
    if (target <= step) {
      setStepErrors([])
      setRevealFieldErrors(false)
      setStep(target)
      return
    }
    const blocker = firstInvalidStep(form)
    if (blocker && blocker < target) {
      setStep(blocker)
      setStepErrors(validateStep(blocker, form))
      setRevealFieldErrors(true)
    } else {
      setStepErrors([])
      setRevealFieldErrors(false)
      setStep(target)
    }
  }

  /** Validate every step, then upload assets, map to the payload and save.
   *  Returns true only when the draft was persisted, so callers (e.g. the
   *  last-step "Tiếp tục") can decide whether to navigate away. */
  const save = async (): Promise<boolean> => {
    if (saving || readOnly) return false
    const blocker = firstInvalidStep(form)
    if (blocker) {
      setStep(blocker)
      setStepErrors(validateStep(blocker, form))
      setRevealFieldErrors(true)
      setSaveMsg({ type: "err", text: "Vui lòng hoàn tất tất cả các bước trước khi lưu." })
      return false
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
      return true
    } catch (err) {
      setSaveMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Lưu sự kiện thất bại — vui lòng thử lại.",
      })
      return false
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

      {step === 2 && (
        <TimeAndTicketsStep
          form={form}
          update={update}
          showErrors={shownShowErrors}
          onShowFieldBlur={(showId, key) => markTouched(`show:${showId}:${key}`)}
        />
      )}

      {step === 3 && (
        <SettingsStep
          form={form}
          update={update}
          errors={shownStep3}
          onBlur={markTouched}
        />
      )}

      {step === 4 && (
        <LogisticsPermitStep
          form={form}
          update={update}
          errors={shownStep4}
          onTouch={() => markTouched("permitDocuments")}
        />
      )}

      {step === 5 && (
        <ContractStep
          form={form}
          update={update}
          errors={shownStep5}
          onBlur={markTouched}
        />
      )}

      {step === 6 && (
        <PaymentStep
          form={form}
          update={update}
          errors={shownStep6}
          onBlur={markTouched}
        />
      )}
      </div>
      </fieldset>
    </div>
  )
}
