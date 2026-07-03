"use client"

import Link from "next/link"
import { ShieldCheck, Megaphone, User as UserIcon, LogIn } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { ProfileInfoForm } from "./ProfileInfoForm"
import { ChangePasswordForm } from "./ChangePasswordForm"

const ROLE_META: Record<string, { label: string; accent: string; Icon: typeof UserIcon }> = {
  PARTICIPANT: { label: "Người tham gia", accent: "#0891b2", Icon: UserIcon },
  ORGANIZER: { label: "Nhà tổ chức", accent: "#7c3aed", Icon: Megaphone },
  ADMIN: { label: "Quản trị viên", accent: "#d97706", Icon: ShieldCheck },
  STAFF: { label: "Nhân viên", accent: "#059669", Icon: ShieldCheck },
}

/**
 * Account settings screen. Gates on auth state (spinner while loading, a login
 * prompt when signed out) then renders the profile summary and the edit cards.
 */
export function AccountSettingsView() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-cyan-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <LogIn className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Bạn chưa đăng nhập</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Vui lòng đăng nhập để xem và cập nhật thông tin cá nhân của bạn.
        </p>
        <Link
          href="/login"
          className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-cyan-700"
        >
          Đăng nhập
        </Link>
      </div>
    )
  }

  const role = ROLE_META[user.role] ?? ROLE_META.PARTICIPANT
  const initial = user.fullName?.charAt(0).toUpperCase() ?? "?"

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Thông tin cá nhân
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý thông tin tài khoản và mật khẩu của bạn.
        </p>
      </header>

      {/* Profile summary */}
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <span
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-2xl font-bold"
          style={{ borderColor: role.accent, color: role.accent }}
        >
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt={user.fullName} className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-foreground">{user.fullName}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <span
            className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: `${role.accent}1a`, color: role.accent }}
          >
            <role.Icon size={12} strokeWidth={2.5} aria-hidden="true" />
            {role.label}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <ProfileInfoForm />
        <ChangePasswordForm />
      </div>
    </div>
  )
}
