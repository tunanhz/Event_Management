"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { CheckCircle2, Send, Wallet, Loader2, AlertTriangle } from "lucide-react"
import { cn, formatVnd, formatDateTime } from "@/lib/utils"
import { WITHDRAWAL_STATUS_LABELS, type WithdrawalStatus } from "./withdrawal-request-data"
import { VN_BANKS } from "../create-event/create-event-data"
import {
  fetchWithdrawalOverview,
  createWithdrawalRequest,
  type WithdrawalOverview,
  type ServerWithdrawalStatus,
} from "./organizer-withdrawal-api"
import tableStyles from "../checkin/checkin.module.css"
import styles from "./withdrawal-request.module.css"

const STATUS_CLASS: Record<WithdrawalStatus, string> = {
  pending: styles.statusPending,
  approved: styles.statusApproved,
  rejected: styles.statusRejected,
}

/** Backend PENDING/APPROVED/REJECTED → the view's lowercase style keys. */
const toDisplayStatus = (s: ServerWithdrawalStatus): WithdrawalStatus =>
  s.toLowerCase() as WithdrawalStatus

interface DefaultPaymentInfo {
  bankName?: string
  accountNumber?: string
  accountHolder?: string
}

/**
 * "Withdrawal Request Form" — real API version. Loads balance + history from
 * GET /withdrawals, submits POST /withdrawals; the backend enforces the
 * post-event rule, min amount and the available-balance cap.
 *
 * `defaultPaymentInfo` (Event.paymentInfo, set in the "Chỉnh sửa" wizard's
 * payout step) pre-fills the form so the organizer isn't retyping the same
 * bank details — each request still saves its own snapshot on submit
 * (Withdrawal.bankName/…), so editing it here only affects this request, not
 * the event's default, and a later change to the event default can't
 * silently retarget an already-sent request.
 */
export function WithdrawalRequestView({
  eventId,
  defaultPaymentInfo,
}: {
  eventId: string
  defaultPaymentInfo?: DefaultPaymentInfo
}) {
  const [overview, setOverview] = useState<WithdrawalOverview | null>(null)
  const [loadError, setLoadError] = useState("")
  const [bank, setBank] = useState(defaultPaymentInfo?.bankName ?? "")
  const [accountNumber, setAccountNumber] = useState(defaultPaymentInfo?.accountNumber ?? "")
  const [accountHolder, setAccountHolder] = useState(defaultPaymentInfo?.accountHolder ?? "")
  const [amount, setAmount] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [justSent, setJustSent] = useState(false)

  const load = useCallback(() => {
    return fetchWithdrawalOverview(eventId)
      .then((o) => {
        setOverview(o)
        setLoadError("")
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Không tải được thông tin rút tiền")
      )
  }, [eventId])

  useEffect(() => {
    let active = true
    fetchWithdrawalOverview(eventId)
      .then((o) => {
        if (active) setOverview(o)
      })
      .catch((e) => {
        if (active)
          setLoadError(e instanceof Error ? e.message : "Không tải được thông tin rút tiền")
      })
    return () => {
      active = false
    }
  }, [eventId])

  const available = overview?.availableBalance ?? 0
  const minWithdrawal = overview?.minWithdrawal ?? 500_000
  const canRequest = !!overview && overview.eventEnded && available >= minWithdrawal

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!bank || !accountNumber.trim() || !accountHolder.trim() || !amount) {
      setError("Vui lòng điền đầy đủ thông tin ngân hàng và số tiền.")
      return
    }
    if (!/^\d{6,20}$/.test(accountNumber.trim())) {
      setError("Số tài khoản chỉ gồm chữ số (6–20 ký tự).")
      return
    }
    if (!Number.isFinite(value) || value < minWithdrawal) {
      setError(`Số tiền rút tối thiểu là ${formatVnd(minWithdrawal)}.`)
      return
    }
    if (value > available) {
      setError(`Số tiền vượt quá số dư khả dụng (${formatVnd(available)}).`)
      return
    }

    setError("")
    setSubmitting(true)
    try {
      await createWithdrawalRequest(eventId, {
        amount: value,
        bankName: bank,
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim().toUpperCase(),
      })
      setAmount("")
      setJustSent(true)
      await load() // refresh balance + history from the server
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi yêu cầu rút tiền thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div role="alert" style={{ color: "#ef4444", padding: "1rem 0" }}>
        <AlertTriangle size={18} aria-hidden="true" style={{ verticalAlign: "middle" }} />{" "}
        {loadError}
      </div>
    )
  }
  if (!overview) {
    return (
      <p role="status" style={{ color: "var(--muted-foreground)", padding: "1rem 0" }}>
        <Loader2
          size={18}
          aria-hidden="true"
          style={{ animation: "spin 0.8s linear infinite", verticalAlign: "middle" }}
        />{" "}
        Đang tải thông tin rút tiền…
      </p>
    )
  }

  const requests = overview.history

  return (
    <div>
      <h1 className={tableStyles.pageHeading}>Yêu cầu rút tiền</h1>

      {/* Available balance — computed server-side from PAID registrations */}
      <div className={styles.balanceCard}>
        <span className={styles.balanceIcon} aria-hidden="true">
          <Wallet size={24} />
        </span>
        <div>
          <p className={styles.balanceLabel}>
            Số dư khả dụng (doanh thu {formatVnd(overview.totalRevenue)} − đã yêu cầu/giải ngân{" "}
            {formatVnd(overview.heldOrPaidOut)})
          </p>
          <p className={styles.balanceValue}>{formatVnd(available)}</p>
        </div>
      </div>

      {!overview.eventEnded && (
        <p
          role="status"
          className={styles.fieldError}
          style={{ marginBottom: "0.9rem", color: "#b45309" }}
        >
          Sự kiện chưa kết thúc — theo chính sách, yêu cầu rút tiền chỉ gửi được sau khi sự kiện
          đã diễn ra xong.
        </p>
      )}

      {/* Request form */}
      <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="wd-bank">
              <span className={styles.required} aria-hidden="true">*</span>Ngân hàng
            </label>
            <select
              id="wd-bank"
              className={styles.select}
              value={bank}
              onChange={(e) => setBank(e.target.value)}
            >
              <option value="">— Chọn ngân hàng —</option>
              {VN_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="wd-account">
              <span className={styles.required} aria-hidden="true">*</span>Số tài khoản
            </label>
            <input
              id="wd-account"
              className={styles.input}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="VD: 0071000123456"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="wd-holder">
              <span className={styles.required} aria-hidden="true">*</span>Chủ tài khoản
            </label>
            <input
              id="wd-holder"
              className={styles.input}
              type="text"
              placeholder="Tên in trên thẻ/tài khoản (không dấu)"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="wd-amount">
              <span className={styles.required} aria-hidden="true">*</span>Số tiền muốn rút (đ)
            </label>
            <input
              id="wd-amount"
              className={styles.input}
              type="number"
              min={minWithdrawal}
              max={available}
              step={1000}
              placeholder={`Tối thiểu ${formatVnd(minWithdrawal)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className={styles.hint}>
              Tối đa {formatVnd(available)}. Đối soát 3–5 ngày làm việc sau khi sự kiện kết thúc.
            </span>
          </div>
        </div>

        {error && (
          <p role="alert" className={styles.fieldError} style={{ marginTop: "0.9rem" }}>
            {error}
          </p>
        )}

        <div className={styles.submitRow}>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!canRequest || submitting}
          >
            <Send size={16} aria-hidden="true" />
            {submitting ? "Đang gửi…" : "Gửi yêu cầu rút tiền"}
          </button>
          {justSent && (
            <span role="status" className={styles.successNote}>
              <CheckCircle2 size={16} aria-hidden="true" />
              Đã gửi — yêu cầu đang chờ Admin đối soát.
            </span>
          )}
        </div>
      </form>

      {/* History — real Withdrawal documents */}
      <h2 className={tableStyles.sectionLabel}>Lịch sử yêu cầu</h2>
      {requests.length === 0 ? (
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
          Chưa có yêu cầu rút tiền nào cho sự kiện này.
        </p>
      ) : (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table} aria-label="Lịch sử yêu cầu rút tiền">
            <thead>
              <tr>
                <th scope="col">Tài khoản nhận</th>
                <th scope="col">Số tiền</th>
                <th scope="col">Ngày gửi</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const display = toDisplayStatus(r.status)
                return (
                  <tr key={r._id}>
                    <td className={styles.bankCell}>
                      <div style={{ fontWeight: 700 }}>{r.bankName}</div>
                      <div className={styles.bankSub}>
                        {r.accountNumber} · {r.accountHolder}
                      </div>
                    </td>
                    <td>{formatVnd(r.amount)}</td>
                    <td>{formatDateTime(r.requestDate)}</td>
                    <td>
                      <span className={cn(styles.status, STATUS_CLASS[display])}>
                        {WITHDRAWAL_STATUS_LABELS[display]}
                        {r.status === "REJECTED" && r.rejectionReason
                          ? ` — ${r.rejectionReason}`
                          : ""}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
