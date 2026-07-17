"use client"

import { useEffect, useState } from "react"
import { Lock, Mail, Users, User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionCard } from "./SectionCard"
import {
  SETTINGS_LIMITS,
  EVENT_URL_PATH,
  slugify,
  type CreateEventForm,
  type EventPrivacy,
} from "./create-event-data"
import formStyles from "./create-event-form.module.css"
import styles from "./settings-step.module.css"
import pageStyles from "@/app/organizer/create-event/create-event.module.css"

interface SettingsStepProps {
  form: CreateEventForm
  update: (patch: Partial<CreateEventForm>) => void
}

/**
 * Step 3 — event settings: custom URL slug, booking privacy, and the
 * post-purchase confirmation message.
 */
export function SettingsStep({ form, update }: SettingsStepProps) {
  // Read origin on the client only to avoid an SSR/CSR hydration mismatch:
  // the server has no `window`, so the URL host must be filled in after mount.
  const [origin, setOrigin] = useState("")
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrigin(window.location.origin), [])

  const slug = slugify(form.slug) || "ten-su-kien"
  const previewUrl = `${origin}${EVENT_URL_PATH}/${slug}`

  return (
    <div className={pageStyles.form}>
      {/* ── Custom URL ─────────────────────────────────────────────── */}
      <SectionCard title="Link dẫn đến sự kiện" required>
        <div className={formStyles.field} style={{ marginBottom: 0 }}>
          <label className={formStyles.label} htmlFor="event-slug">
            <span className={formStyles.required} aria-hidden="true">*</span>
            Tùy chỉnh đường dẫn
          </label>
          <div className={formStyles.inputWrap}>
            <input
              id="event-slug"
              className={formStyles.input}
              type="text"
              maxLength={SETTINGS_LIMITS.slug}
              placeholder="ten-su-kien"
              value={form.slug}
              onChange={(e) => update({ slug: e.target.value })}
            />
            <span className={formStyles.counter}>
              {form.slug.length} / {SETTINGS_LIMITS.slug}
            </span>
          </div>
          <p className={styles.urlPreview}>
            Đường dẫn sự kiện của bạn là:{" "}
            <span className={styles.urlLink}>{previewUrl}</span>
          </p>
        </div>
      </SectionCard>

      {/* ── Privacy ────────────────────────────────────────────────── */}
      <SectionCard title="Quyền riêng tư sự kiện" icon={Lock}>
        <div className={styles.radioGroup} role="radiogroup" aria-label="Quyền riêng tư sự kiện">
          <PrivacyOption
            value="public"
            current={form.privacy}
            icon={Users}
            title="Sự kiện mở cho mọi người"
            desc="Tất cả mọi người đều có thể đặt vé"
            onSelect={(privacy) => update({ privacy })}
          />
          <PrivacyOption
            value="private"
            current={form.privacy}
            icon={UserIcon}
            title="Sự kiện dành riêng cho 1 nhóm"
            desc="Chỉ người có link truy cập mới đặt được vé"
            onSelect={(privacy) => update({ privacy })}
          />
        </div>
      </SectionCard>

      {/* ── Confirmation message ───────────────────────────────────── */}
      <SectionCard title="Tin nhắn xác nhận cho người tham gia" icon={Mail}>
        <p className={styles.helperText}>
          Tin nhắn xác nhận này sẽ được gửi đến cho người tham gia sau khi đặt vé
          thành công.
        </p>
        <textarea
          className={formStyles.textarea}
          style={{ minHeight: 180 }}
          maxLength={SETTINGS_LIMITS.confirmationMessage}
          value={form.confirmationMessage}
          onChange={(e) => update({ confirmationMessage: e.target.value })}
          aria-label="Tin nhắn xác nhận cho người tham gia"
        />
        <div className={formStyles.counterBlock}>
          {form.confirmationMessage.length} / {SETTINGS_LIMITS.confirmationMessage}
        </div>
      </SectionCard>
    </div>
  )
}

/** One privacy radio choice (icon + title + description). */
function PrivacyOption({
  value,
  current,
  icon: Icon,
  title,
  desc,
  onSelect,
}: {
  value: EventPrivacy
  current: EventPrivacy
  icon: typeof Users
  title: string
  desc: string
  onSelect: (value: EventPrivacy) => void
}) {
  const active = current === value
  return (
    <label className={cn(styles.radioOption, active && styles.radioOptionActive)}>
      <input
        type="radio"
        name="event-privacy"
        className={styles.radioInput}
        checked={active}
        onChange={() => onSelect(value)}
      />
      <Icon size={22} className={styles.radioIcon} aria-hidden="true" />
      <span className={styles.radioText}>
        <span className={styles.radioTitle}>{title}</span>
        <span className={styles.radioDesc}>{desc}</span>
      </span>
    </label>
  )
}
