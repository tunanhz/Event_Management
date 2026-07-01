"use client"

import { MapPinned, PlayCircle, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionCard } from "./SectionCard"
import {
  EVENT_CATEGORIES,
  PROVINCES,
  getWards,
  LIMITS,
  type CreateEventForm,
  type LocationType,
} from "./create-event-data"
import styles from "./create-event-form.module.css"

interface EventBasicInfoProps {
  form: CreateEventForm
  update: (patch: Partial<CreateEventForm>) => void
}

/** Cards for event name, address (offline/online) and category. */
export function EventBasicInfo({ form, update }: EventBasicInfoProps) {
  const setLocationType = (locationType: LocationType) =>
    update({ locationType, province: "", ward: "" })

  return (
    <>
      {/* ── Event name ─────────────────────────────────────────── */}
      <SectionCard title="Tên sự kiện" required>
        <div className={styles.inputWrap}>
          <input
            className={styles.input}
            type="text"
            maxLength={LIMITS.name}
            placeholder="Tên sự kiện"
            aria-label="Tên sự kiện"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
          />
          <span className={styles.counter}>
            {form.name.length} / {LIMITS.name}
          </span>
        </div>
      </SectionCard>

      {/* ── Address ────────────────────────────────────────────── */}
      <SectionCard title="Địa chỉ sự kiện" required>
        <div className={styles.segment} role="group" aria-label="Hình thức tổ chức">
          <button
            type="button"
            className={cn(styles.segmentBtn, form.locationType === "offline" && styles.segmentBtnActive)}
            aria-pressed={form.locationType === "offline"}
            onClick={() => setLocationType("offline")}
          >
            <MapPinned size={18} aria-hidden="true" />
            Offline
          </button>
          <button
            type="button"
            className={cn(styles.segmentBtn, form.locationType === "online" && styles.segmentBtnActive)}
            aria-pressed={form.locationType === "online"}
            onClick={() => setLocationType("online")}
          >
            <PlayCircle size={18} aria-hidden="true" />
            Online
          </button>
        </div>

        {form.locationType === "offline" ? (
          <>
            <Field label="Tên địa điểm" required>
              <div className={styles.inputWrap}>
                <input
                  className={styles.input}
                  type="text"
                  maxLength={LIMITS.venueName}
                  placeholder="Tên địa điểm"
                  aria-label="Tên địa điểm"
                  value={form.venueName}
                  onChange={(e) => update({ venueName: e.target.value })}
                />
                <span className={styles.counter}>
                  {form.venueName.length} / {LIMITS.venueName}
                </span>
              </div>
            </Field>

            <div className={styles.grid2}>
              <Field label="Tỉnh/Thành" required>
                <SelectBox
                  value={form.province}
                  placeholder="Tỉnh/Thành"
                  options={PROVINCES}
                  onChange={(v) => update({ province: v, ward: "" })}
                />
              </Field>
              <Field label="Phường/Xã">
                <SelectBox
                  value={form.ward}
                  placeholder="Phường/Xã"
                  options={getWards(form.province)}
                  disabled={!form.province}
                  onChange={(v) => update({ ward: v })}
                />
              </Field>
            </div>

            <Field label="Số nhà, đường" required>
              <div className={styles.inputWrap}>
                <input
                  className={styles.input}
                  type="text"
                  maxLength={LIMITS.street}
                  placeholder="Số nhà, đường"
                  aria-label="Số nhà, đường"
                  value={form.street}
                  onChange={(e) => update({ street: e.target.value })}
                />
                <span className={styles.counter}>
                  {form.street.length} / {LIMITS.street}
                </span>
              </div>
            </Field>
          </>
        ) : (
          <Field label="Link tham gia sự kiện" required>
            <input
              className={styles.input}
              type="url"
              placeholder="https://..."
              aria-label="Link tham gia sự kiện"
              value={form.street}
              style={{ paddingRight: "1rem" }}
              onChange={(e) => update({ street: e.target.value })}
            />
          </Field>
        )}
      </SectionCard>

      {/* ── Category ───────────────────────────────────────────── */}
      <SectionCard title="Thể loại sự kiện" required>
        <SelectBox
          value={form.category}
          placeholder="Vui lòng chọn"
          options={EVENT_CATEGORIES}
          onChange={(v) => update({ category: v })}
        />
      </SectionCard>
    </>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {required && <span className={styles.required} aria-hidden="true">*</span>}
        {label}
      </label>
      {children}
    </div>
  )
}

function SelectBox({
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  value: string
  placeholder: string
  options: string[]
  disabled?: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className={styles.inputWrap}>
      <select
        className={cn(styles.select, !value && styles.selectEmpty)}
        value={value}
        disabled={disabled}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown size={18} className={styles.selectChevron} aria-hidden="true" />
    </div>
  )
}
