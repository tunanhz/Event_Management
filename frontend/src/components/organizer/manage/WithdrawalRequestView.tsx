"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, Send, Wallet } from "lucide-react"
import { cn, formatVnd, formatDateTime } from "@/lib/utils"
import {
  BANKS,
  MIN_WITHDRAWAL_VND,
  WITHDRAWAL_STATUS_LABELS,
  type WithdrawalRequest,
  type WithdrawalStatus,
} from "./withdrawal-request-data"
import tableStyles from "../checkin/checkin.module.css"
import styles from "./withdrawal-request.module.css"

const STATUS_CLASS: Record<WithdrawalStatus, string> = {
  pending: styles.statusPending,
  approved: styles.statusApproved,
  rejected: styles.statusRejected,
}

interface WithdrawalRequestViewProps {
  availableBalance: number
  history: WithdrawalRequest[]
}

/**
 * "Withdrawal Request Form": banking coordinates + amount, plus request
 * history. Mock only — submit appends a PENDING row locally; pending amounts
 * are held back from the available balance.
 */
export function WithdrawalRequestView({ availableBalance, history }: WithdrawalRequestViewProps) {
  const [requests, setRequests] = useState<WithdrawalRequest[]>(history)
  const [bank, setBank] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [amount, setAmount] = useState("")
  const [error, setError] = useState("")
  const [justSent, setJustSent] = useState(false)

  const heldBack = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.amount, 0)
  const available = Math.max(0, availableBalance - heldBack)

  const handleSubmit = (e: FormEvent) => {
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
    if (!Number.isFinite(value) || value < MIN_WITHDRAWAL_VND) {
      setError(`Số tiền rút tối thiểu là ${formatVnd(MIN_WITHDRAWAL_VND)}.`)
      return
    }
    if (value > available) {
      setError(`Số tiền vượt quá số dư khả dụng (${formatVnd(available)}).`)
      return
    }

    setError("")
    setRequests((prev) => [
      {
        id: `wd-local-${prev.length + 1}`,
        amount: value,
        bank,
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim().toUpperCase(),
        requestedAt: new Date().toISOString(),
        status: "pending",
      },
      ...prev,
    ])
    setAmount("")
    setJustSent(true)
  }

  return (
    <div>
      <h1 className={tableStyles.pageHeading}>Yêu cầu rút tiền</h1>

      {/* Available balance */}
      <div className={styles.balanceCard}>
        <span className={styles.balanceIcon} aria-hidden="true">
          <Wallet size={24} />
        </span>
        <div>
          <p className={styles.balanceLabel}>Số dư khả dụng (sau phí nền tảng và các yêu cầu đang chờ)</p>
          <p className={styles.balanceValue}>{formatVnd(available)}</p>
        </div>
      </div>

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
              {BANKS.map((b) => (
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
              min={MIN_WITHDRAWAL_VND}
              max={available}
              step={1000}
              placeholder={`Tối thiểu ${formatVnd(MIN_WITHDRAWAL_VND)}`}
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
          <button type="submit" className={styles.submitBtn} disabled={available <= 0}>
            <Send size={16} aria-hidden="true" />
            Gửi yêu cầu rút tiền
          </button>
          {justSent && (
            <span role="status" className={styles.successNote}>
              <CheckCircle2 size={16} aria-hidden="true" />
              Đã gửi — yêu cầu đang chờ Admin đối soát.
            </span>
          )}
        </div>
      </form>

      {/* History */}
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
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className={styles.bankCell}>
                    <div style={{ fontWeight: 700 }}>{r.bank}</div>
                    <div className={styles.bankSub}>
                      {r.accountNumber} · {r.accountHolder}
                    </div>
                  </td>
                  <td>{formatVnd(r.amount)}</td>
                  <td>{formatDateTime(r.requestedAt)}</td>
                  <td>
                    <span className={cn(styles.status, STATUS_CLASS[r.status])}>
                      {WITHDRAWAL_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
