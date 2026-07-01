"use client"

import { useState } from "react"
import { Wrench } from "lucide-react"
import { StepTabs } from "@/components/organizer/create-event/StepTabs"
import { ImageUploader } from "@/components/organizer/create-event/ImageUploader"
import { EventBasicInfo } from "@/components/organizer/create-event/EventBasicInfo"
import { RichTextEditor } from "@/components/organizer/create-event/RichTextEditor"
import { OrganizerInfo } from "@/components/organizer/create-event/OrganizerInfo"
import { SectionCard } from "@/components/organizer/create-event/SectionCard"
import {
  INITIAL_FORM,
  WIZARD_STEPS,
  type CreateEventForm,
  type WizardStep,
} from "@/components/organizer/create-event/create-event-data"
import styles from "./create-event.module.css"

export default function CreateEventPage() {
  const [step, setStep] = useState<WizardStep>(1)
  const [form, setForm] = useState<CreateEventForm>(INITIAL_FORM)

  const update = (patch: Partial<CreateEventForm>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const goNext = () =>
    setStep((s) => (Math.min(s + 1, 4) as WizardStep))

  const save = () => {
    // Persisting the draft is out of scope for this screen; log for now.
    console.log("Lưu bản nháp sự kiện:", form)
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
