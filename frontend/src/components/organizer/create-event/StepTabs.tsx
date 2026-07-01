"use client"

import { Fragment } from "react"
import { ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { WIZARD_STEPS, type WizardStep } from "./create-event-data"
import styles from "./StepTabs.module.css"

interface StepTabsProps {
  current: WizardStep
  onSelect: (step: WizardStep) => void
  onSave?: () => void
  onNext?: () => void
}

/** Four-step wizard header with Save / Continue actions. */
export function StepTabs({ current, onSelect, onSave, onNext }: StepTabsProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.tabs} role="tablist" aria-label="Các bước tạo sự kiện">
        {WIZARD_STEPS.map((step, i) => {
          const isActive = step.id === current
          const isDone = step.id < current
          return (
            <Fragment key={step.id}>
              {i > 0 && (
                <span className={styles.sep} aria-hidden="true">
                  <ChevronRight size={18} />
                </span>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className={cn(styles.tab, isActive && styles.tabActive)}
                onClick={() => onSelect(step.id)}
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
        <button type="button" className={styles.saveBtn} onClick={onSave}>
          Lưu
        </button>
        <button type="button" className={styles.nextBtn} onClick={onNext}>
          Tiếp tục
        </button>
      </div>
    </div>
  )
}
