"use client"

import { MapPinned, PlayCircle, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionCard } from "./SectionCard"
import { FieldError } from "./FieldError"
import { LIMITS, type CreateEventForm, type LocationType } from "./create-event-data"
import type { Step1FieldKey } from "./wizard-validation"
import { useVietnamAddressData } from "./use-vietnam-address-data"
import { useEventCategories } from "./use-event-categories"
import styles from "./create-event-form.module.css"

interface EventBasicInfoProps {
  form: CreateEventForm
  update: (patch: Partial<CreateEventForm>) => void
  /** Per-field validation messages to show inline (already filtered by touched). */
  errors?: Partial<Record<Step1FieldKey, string>>
  /** Marks a field as touched (blurred) so its error can surface. */
  onBlur?: (key: Step1FieldKey) => void
}

/** Cards for event name, address (offline/online) and category. */
export function EventBasicInfo({ form, update, errors, onBlur }: EventBasicInfoProps) {
  // Official 34-province / ward dataset (post-2025 merger), lazy-loaded.
  const { loaded, error, provinceNames, getWardNames } = useVietnamAddressData()
  // Live categories — the form stores the category _id the backend expects.
  const categories = useEventCategories()

  const setLocationType = (locationType: LocationType) =>
    update({ locationType, province: "", ward: "" })

  const err = (key: Step1FieldKey) => errors?.[key]

  return (
    <>
      {/* ── Event name ─────────────────────────────────────────── */}
      <SectionCard title="Tên sự kiện" required>
        <div className={styles.inputWrap}>
          <input
            id="event-name"
            className={cn(styles.input, err("name") && styles.inputError)}
            type="text"
            maxLength={LIMITS.name}
            placeholder="Tên sự kiện"
            aria-label="Tên sự kiện"
            aria-required="true"
            aria-invalid={!!err("name") || undefined}
            aria-describedby={err("name") ? "err-event-name" : undefined}
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            onBlur={() => onBlur?.("name")}
          />
          <span className={styles.counter}>
            {form.name.length} / {LIMITS.name}
          </span>
        </div>
        <FieldError id="err-event-name" msg={err("name")} />
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
            <Field label="Tên địa điểm" required htmlFor="venue-name" error={err("venueName")}>
              <div className={styles.inputWrap}>
                <input
                  id="venue-name"
                  className={cn(styles.input, err("venueName") && styles.inputError)}
                  type="text"
                  maxLength={LIMITS.venueName}
                  placeholder="Tên địa điểm"
                  aria-required="true"
                  aria-invalid={!!err("venueName") || undefined}
                  aria-describedby={err("venueName") ? "err-venue-name" : undefined}
                  value={form.venueName}
                  onChange={(e) => update({ venueName: e.target.value })}
                  onBlur={() => onBlur?.("venueName")}
                />
                <span className={styles.counter}>
                  {form.venueName.length} / {LIMITS.venueName}
                </span>
              </div>
            </Field>

            <div className={styles.grid2}>
              <Field label="Tỉnh/Thành" required htmlFor="venue-province">
                <SelectBox
                  id="venue-province"
                  required
                  value={form.province}
                  placeholder={loaded ? "Tỉnh/Thành" : error ? "Không tải được danh sách" : "Đang tải…"}
                  options={provinceNames}
                  disabled={!loaded}
                  error={err("province")}
                  onChange={(v) => update({ province: v, ward: "" })}
                  onBlur={() => onBlur?.("province")}
                />
              </Field>
              <Field label="Phường/Xã" required htmlFor="venue-ward">
                <SelectBox
                  id="venue-ward"
                  required
                  value={form.ward}
                  placeholder="Phường/Xã"
                  options={getWardNames(form.province)}
                  disabled={!form.province}
                  error={err("ward")}
                  onChange={(v) => update({ ward: v })}
                  onBlur={() => onBlur?.("ward")}
                />
              </Field>
            </div>

            <Field label="Số nhà, đường" required htmlFor="venue-street" error={err("street")}>
              <div className={styles.inputWrap}>
                <input
                  id="venue-street"
                  className={cn(styles.input, err("street") && styles.inputError)}
                  type="text"
                  maxLength={LIMITS.street}
                  placeholder="Số nhà, đường"
                  aria-required="true"
                  aria-invalid={!!err("street") || undefined}
                  aria-describedby={err("street") ? "err-venue-street" : undefined}
                  value={form.street}
                  onChange={(e) => update({ street: e.target.value })}
                  onBlur={() => onBlur?.("street")}
                />
                <span className={styles.counter}>
                  {form.street.length} / {LIMITS.street}
                </span>
              </div>
            </Field>
          </>
        ) : (
          <Field label="Link tham gia sự kiện" required htmlFor="event-link" error={err("street")}>
            <input
              id="event-link"
              className={cn(styles.input, err("street") && styles.inputError)}
              type="url"
              placeholder="https://..."
              aria-required="true"
              aria-invalid={!!err("street") || undefined}
              aria-describedby={err("street") ? "err-event-link" : undefined}
              value={form.street}
              style={{ paddingRight: "1rem" }}
              onChange={(e) => update({ street: e.target.value })}
              onBlur={() => onBlur?.("street")}
            />
          </Field>
        )}
      </SectionCard>

      {/* ── Category ───────────────────────────────────────────── */}
      <SectionCard title="Thể loại sự kiện" required>
        <SelectBox
          id="event-category"
          required
          value={form.category}
          placeholder={categories.length ? "Vui lòng chọn" : "Đang tải thể loại…"}
          options={categories.map((c) => ({ value: c._id, label: c.name }))}
          disabled={categories.length === 0}
          error={err("category")}
          onChange={(v) => update({ category: v })}
          onBlur={() => onBlur?.("category")}
        />
      </SectionCard>
    </>
  )
}

function Field({
  label,
  required,
  htmlFor,
  error,
  children,
}: {
  label: string
  required?: boolean
  /** Links the visible label to its control (input/select shares this id). */
  htmlFor?: string
  /** Error rendered under the field (text inputs). Selects render their own. */
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {required && <span className={styles.required} aria-hidden="true">*</span>}
        {label}
      </label>
      {children}
      <FieldError id={htmlFor ? `err-${htmlFor}` : undefined} msg={error} />
    </div>
  )
}

function SelectBox({
  id,
  value,
  placeholder,
  options,
  disabled,
  required,
  error,
  onChange,
  onBlur,
}: {
  id?: string
  value: string
  placeholder: string
  /** Plain strings (value = label) or explicit value/label pairs. */
  options: (string | { value: string; label: string })[]
  disabled?: boolean
  required?: boolean
  error?: string
  onChange: (v: string) => void
  onBlur?: () => void
}) {
  const pairs = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  )
  const errId = id ? `err-${id}` : undefined
  return (
    <>
      <div className={styles.inputWrap}>
        <select
          id={id}
          className={cn(styles.select, !value && styles.selectEmpty, error && styles.inputError)}
          value={value}
          disabled={disabled}
          aria-label={placeholder}
          aria-required={required || undefined}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errId : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {pairs.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} className={styles.selectChevron} aria-hidden="true" />
      </div>
      <FieldError id={errId} msg={error} />
    </>
  )
}
