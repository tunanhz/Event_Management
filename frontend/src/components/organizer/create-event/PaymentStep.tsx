"use client"

import { Landmark, CreditCard, User as UserIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionCard } from "./SectionCard"
import { VN_BANKS, PAYMENT_LIMITS, type CreateEventForm } from "./create-event-data"
import formStyles from "./create-event-form.module.css"
import styles from "./payment-step.module.css"
import pageStyles from "@/app/organizer/create-event/create-event.module.css"

interface PaymentStepProps {
  form: CreateEventForm
  update: (patch: Partial<CreateEventForm>) => void
}

/**
 * Step 6 — payout bank account. EventBox settles ticket revenue (minus service
 * fee) to this account. Fields map to the backend `paymentInfo` subdocument.
 */
export function PaymentStep({ form, update }: PaymentStepProps) {
  return (
    <div className={pageStyles.form}>
      <SectionCard title="Thông tin thanh toán (nhận doanh thu)" icon={Landmark}>
        <p className={styles.intro}>
          Doanh thu bán vé (sau khi trừ phí dịch vụ) sẽ được EventBox đối soát và
          chuyển về tài khoản ngân hàng dưới đây khi sự kiện kết thúc. Vui lòng
          nhập chính xác — thông tin này chỉ Ban tổ chức và Admin nhìn thấy.
        </p>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="bank-name">
            <span className={formStyles.required} aria-hidden="true">*</span>
            Ngân hàng
          </label>
          <div className={formStyles.inputWrap}>
            <span className={styles.leadingIcon} aria-hidden="true">
              <Landmark size={18} />
            </span>
            <select
              id="bank-name"
              className={cn(formStyles.input, styles.select, !form.bankName && styles.selectEmpty)}
              value={form.bankName}
              onChange={(e) => update({ bankName: e.target.value })}
            >
              <option value="" disabled>
                Chọn ngân hàng
              </option>
              {VN_BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
            <ChevronDown size={18} className={styles.selectChevron} aria-hidden="true" />
          </div>
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="bank-account-number">
            <span className={formStyles.required} aria-hidden="true">*</span>
            Số tài khoản
          </label>
          <div className={formStyles.inputWrap}>
            <span className={styles.leadingIcon} aria-hidden="true">
              <CreditCard size={18} />
            </span>
            <input
              id="bank-account-number"
              className={cn(formStyles.input, styles.withIcon)}
              type="text"
              inputMode="numeric"
              maxLength={PAYMENT_LIMITS.accountNumber}
              placeholder="Số tài khoản nhận tiền"
              value={form.bankAccountNumber}
              // Chỉ giữ chữ số — số tài khoản VN không có ký tự khác.
              onChange={(e) =>
                update({ bankAccountNumber: e.target.value.replace(/[^0-9]/g, "") })
              }
              autoComplete="off"
            />
          </div>
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="bank-account-holder">
            <span className={formStyles.required} aria-hidden="true">*</span>
            Chủ tài khoản
          </label>
          <div className={formStyles.inputWrap}>
            <span className={styles.leadingIcon} aria-hidden="true">
              <UserIcon size={18} />
            </span>
            <input
              id="bank-account-holder"
              className={cn(formStyles.input, styles.withIcon, styles.upper)}
              type="text"
              maxLength={PAYMENT_LIMITS.accountHolder}
              placeholder="NGUYEN VAN A"
              value={form.bankAccountHolder}
              // Chủ tài khoản in hoa không dấu như trên thẻ ngân hàng.
              onChange={(e) => update({ bankAccountHolder: e.target.value.toUpperCase() })}
              autoComplete="off"
            />
          </div>
          <p className={styles.hint}>Nhập in hoa, không dấu — đúng như tên trên thẻ/tài khoản.</p>
        </div>
      </SectionCard>

      {/* Live preview of the payout account so the organizer can double-check. */}
      {(form.bankName || form.bankAccountNumber || form.bankAccountHolder) && (
        <SectionCard title="Xem trước tài khoản nhận tiền">
          <div className={styles.previewCard}>
            <div className={styles.previewRow}>
              <span className={styles.previewLabel}>Ngân hàng</span>
              <span className={styles.previewValue}>{form.bankName || "—"}</span>
            </div>
            <div className={styles.previewRow}>
              <span className={styles.previewLabel}>Số tài khoản</span>
              <span className={styles.previewValue}>{form.bankAccountNumber || "—"}</span>
            </div>
            <div className={styles.previewRow}>
              <span className={styles.previewLabel}>Chủ tài khoản</span>
              <span className={styles.previewValue}>{form.bankAccountHolder || "—"}</span>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
