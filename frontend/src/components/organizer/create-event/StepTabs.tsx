"use client"

import { Fragment, useRef } from "react"
import { ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { WIZARD_STEPS, type WizardStep } from "./create-event-data"
import styles from "./StepTabs.module.css"

interface StepTabsProps {
  current: WizardStep
  /** Highest step the organizer may open (first incomplete step). Later tabs
   *  are locked until earlier steps validate. */
  maxStep?: WizardStep
  onSelect: (step: WizardStep) => void
  onSave?: () => void
  onNext?: () => void
  /** Locks both actions while a save (uploads + API calls) is in flight. */
  saving?: boolean
}

/** Wizard header with step tabs and Save / Continue actions. */
export function StepTabs({ current, maxStep = 6, onSelect, onSave, onNext, saving }: StepTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Arrow-key roving within the reachable (unlocked) steps: 1…maxStep.
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"]
    if (!keys.includes(e.key)) return
    e.preventDefault()
    const reachable = WIZARD_STEPS.filter((s) => s.id <= maxStep)
    const pos = Math.max(0, reachable.findIndex((s) => s.id === WIZARD_STEPS[index].id))
    const lastPos = reachable.length - 1
    const nextPos =
      e.key === "ArrowRight" ? Math.min(pos + 1, lastPos)
      : e.key === "ArrowLeft" ? Math.max(pos - 1, 0)
      : e.key === "Home" ? 0
      : lastPos
    const target = reachable[nextPos]
    onSelect(target.id)
    tabRefs.current[target.id - 1]?.focus()
  }

  return (
    <div className={styles.bar}>
      <div className={styles.tabs} role="tablist" aria-label="Các bước tạo sự kiện">
        {WIZARD_STEPS.map((step, i) => {
          const isActive = step.id === current
          const isDone = step.id < current
          // Locked when it's a forward step past the first incomplete one.
          const locked = step.id > current && step.id > maxStep
          return (
            <Fragment key={step.id}>
              {i > 0 && (
                <span className={styles.sep} aria-hidden="true">
                  <ChevronRight size={18} />
                </span>
              )}
              <button
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                id={`wizard-tab-${step.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="wizard-panel"
                tabIndex={isActive ? 0 : -1}
                disabled={locked}
                title={locked ? "Hoàn tất các bước trước để mở khoá bước này" : undefined}
                className={cn(styles.tab, isActive && styles.tabActive, locked && styles.tabLocked)}
                onClick={() => onSelect(step.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <span
                  className={cn(
                    styles.num,
                    isActive && styles.numActive,
                    isDone && styles.numDone
                  )}
                >
                  {isDone ? <Check size={15} /> : step.id}
                </span>
                {step.label}
              </button>
            </Fragment>
          )
        })}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.saveBtn} onClick={onSave} disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" className={styles.nextBtn} onClick={onNext} disabled={saving}>
          Tiếp tục
        </button>
      </div>
    </div>
  )
}
