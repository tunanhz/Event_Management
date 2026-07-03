"use client"

import { useState, type FormEvent } from "react"
import { Lock, KeyRound, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react"
import { clientApi } from "@/lib/client-api"
import { AccountField } from "./AccountField"

/**
 * Change-password card. Mirrors the backend contract (currentPassword +
 * newPassword) and validates the new/confirm pair on the client before submit.
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const clearFeedback = () => {
    setError("")
    setSuccess(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (!currentPassword || !newPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại và mật khẩu mới")
      return
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp")
      return
    }

    try {
      setSaving(true)
      await clientApi.put("/users/me", { currentPassword, newPassword })
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi mật khẩu thất bại. Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-foreground">Đổi mật khẩu</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Để bảo mật, hãy dùng mật khẩu mạnh và không dùng lại ở nơi khác.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        <AccountField
          id="currentPassword"
          label="Mật khẩu hiện tại"
          icon={Lock}
          type="password"
          value={currentPassword}
          onChange={(v) => {
            setCurrentPassword(v)
            clearFeedback()
          }}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        <AccountField
          id="newPassword"
          label="Mật khẩu mới"
          icon={KeyRound}
          type="password"
          value={newPassword}
          onChange={(v) => {
            setNewPassword(v)
            clearFeedback()
          }}
          placeholder="Tối thiểu 6 ký tự"
          required
          autoComplete="new-password"
          helperText="Ít nhất 6 ký tự."
        />

        <AccountField
          id="confirmPassword"
          label="Xác nhận mật khẩu mới"
          icon={ShieldCheck}
          type="password"
          value={confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v)
            clearFeedback()
          }}
          placeholder="Nhập lại mật khẩu mới"
          required
          autoComplete="new-password"
          error={
            confirmPassword && newPassword !== confirmPassword
              ? "Mật khẩu xác nhận không khớp"
              : undefined
          }
        />

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">Đổi mật khẩu thành công.</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-cyan-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </button>
        </div>
      </form>
    </section>
  )
}
