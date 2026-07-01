"use client"

import { useState } from "react"
import { Wrench } from "lucide-react"
import { StepTabs } from "./StepTabs"
import { ImageUploader } from "./ImageUploader"
import { EventBasicInfo } from "./EventBasicInfo"
import { RichTextEditor } from "./RichTextEditor"
import { OrganizerInfo } from "./OrganizerInfo"
import { SectionCard } from "./SectionCard"
import {
  WIZARD_STEPS,
  type CreateEventForm,
  type WizardStep,
} from "./create-event-data"
import styles from "@/app/organizer/create-event/create-event.module.css"

/**
 * Reusable event form wizard. Seeded from `initialForm` so it powers both the
 * "Tạo sự kiện" (empty) and "Chỉnh sửa" (pre-filled) flows.
 */
export function EventWizard({ initialForm }: { initialForm: CreateEventForm }) {
  const [step, setStep] = useState<WizardStep>(1)
  const [form, setForm] = useState<CreateEventForm>(initialForm)

  const update = (patch: Partial<CreateEventForm>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const goNext = () => setStep((s) => Math.min(s + 1, 4) as WizardStep)

  const save = () => {
    // Persisting the draft is out of scope for this screen; log for now.
    console.log("Lưu sự kiện:", form)
  }

  return (
    <div className={styles.page}>
      <StepTabs current={step} onSelect={setStep} onSave={save} onNext={goNext} />

      {step === 1 ? (
        <div className={styles.form}>
          <ImageUploader
            poster={form.posterImage}
            banner={form.bannerImage}
            onPosterChange={(url) => update({ posterImage: url })}
            onBannerChange={(url) => update({ bannerImage: url })}
          />

          <EventBasicInfo form={form} update={update} />

          <SectionCard title="Thông tin sự kiện" required>
            <RichTextEditor
              initialHTML={form.description}
              onChange={(html) => update({ description: html })}
            />
          </SectionCard>

          <OrganizerInfo data={form} update={update} />
        </div>
      ) : (
        <StepPlaceholder step={step} />
      )}
    </div>
  )
}

function StepPlaceholder({ step }: { step: WizardStep }) {
  const label = WIZARD_STEPS.find((s) => s.id === step)?.label ?? ""
  return (
    <div className={styles.placeholder}>
      <span className={styles.placeholderIcon}>
        <Wrench size={32} aria-hidden="true" />
      </span>
      <h2 className={styles.placeholderTitle}>{label}</h2>
      <p className={styles.placeholderText}>
        Bước này đang được hoàn thiện. Vui lòng hoàn tất “Thông tin sự kiện” ở
        bước 1 trước.
      </p>
    </div>
  )
}
