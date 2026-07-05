"use client"

import { useState, type FormEvent } from "react"
import { User as UserIcon, Mail, Phone, Save, CheckCircle2, AlertCircle } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { clientApi } from "@/lib/client-api"
import { AccountField } from "./AccountField"

/**
 * Editable personal-info card. Only the display name is editable — email is the
 * account identity (changing it needs re-verification) and phone is shown
 * read-only, so both stay locked here.
 */
export function ProfileInfoForm() {
  const { user, refreshUser } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const trimmed = fullName.trim()
  const dirty = trimmed !== (user?.fullName ?? "")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (!trimmed) {
      setError("Họ và tên không được để trống")
      return
    }

    try {
      setSaving(true)
      await clientApi.put("/users/me", { fullName: trimmed })
      await refreshUser()
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại. Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-foreground">Thông tin cá nhân</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Cập nhật tên hiển thị của bạn.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        <AccountField
          id="fullName"
          label="Họ và tên"
          icon={UserIcon}
          value={fullName}
          onChange={(v) => {
            setFullName(v)
            setSuccess(false)
            setError("")
          }}
          placeholder="Nguyễn Văn A"
          required
          autoComplete="name"
        />

        <AccountField
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          value={user?.email ?? ""}
          readOnly
          helperText="Email đăng nhập không thể thay đổi."
        />

        <AccountField
          id="phone"
          label="Số điện thoại"
          icon={Phone}
          type="tel"
          value={user?.phone ?? "Chưa cập nhật"}
          readOnly
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
            <span className="font-medium">Đã lưu thông tin cá nhân.</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-cyan-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </section>
  )
}
