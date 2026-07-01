

"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { clientApi } from "@/lib/client-api"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel"
import {
  Ticket,
  Lock,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
} from "lucide-react"

function ActivateContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get("token")

  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Live validation hints
  const passwordValid = password.length >= 6
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const tokenMissing = !!error && !token

  useEffect(() => {
    if (!token) {
      setError("Đường dẫn kích hoạt tài khoản không hợp lệ hoặc thiếu mã xác thực.")
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError("Mã kích hoạt không hợp lệ.")
      return
    }

    if (!fullName.trim()) {
      setError("Vui lòng điền Họ và Tên của bạn.")
      return
    }

    if (password.length < 6) {
      setError("Mật khẩu mới phải có tối thiểu 6 ký tự.")
      return
    }

    if (password !== confirmPassword) {
      setError("Xác nhận mật khẩu mới không khớp.")
      return
    }

    try {
      setLoading(true)
      setError("")

      const res = await clientApi.post<{ success: boolean; message: string }>("/users/activate", {
        token,
        fullName: fullName.trim(),
        password,
      })

      if (res.success) {
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message || "Kích hoạt tài khoản thất bại. Liên kết có thể đã hết hạn.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md space-y-8 text-center animate-fade-up">
        <div className="flex flex-col items-center">
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-emerald-500/15 animate-pulse-soft" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 shadow-inner dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/50">
              <CheckCircle2 className="h-8 w-8" />
            </span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Kích hoạt thành công!
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Tài khoản nhân viên của bạn đã được kích hoạt. Mật khẩu mới đã được cập nhật vào hệ thống —
            bạn có thể đăng nhập ngay bây giờ.
          </p>
        </div>

        <button
          onClick={() => router.push("/login")}
          className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-cyan-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
        >
          Đăng nhập hệ thống
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-8 animate-fade-up">
      {/* Compact logo (brand panel hidden below lg) */}
      <Link
        href="/"
        aria-label="Về trang chủ EventBox"
        className="flex items-center justify-center gap-2 lg:hidden"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 shadow-md">
          <Ticket className="h-5 w-5 text-white" />
        </span>
        <span className="text-xl font-extrabold tracking-tight text-foreground">EventBox</span>
      </Link>

      {/* Heading */}
      <div className="text-center lg:text-left">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/50">
          Kích hoạt tài khoản Staff
        </span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
          Kích hoạt tài khoản
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cập nhật thông tin và đặt mật khẩu mới để hoàn tất kích hoạt tài khoản nhân viên của bạn.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 animate-shake"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* FullName Input */}
          <div>
            <label
              htmlFor="fullName"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground"
            >
              Họ và Tên của bạn
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full rounded-xl border border-border bg-muted py-3 pl-10 pr-3 text-foreground placeholder-slate-400 transition-all focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm"
                placeholder="Nhập họ và tên đầy đủ"
                disabled={tokenMissing}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground"
            >
              Mật khẩu mới
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-border bg-muted py-3 pl-10 pr-11 text-foreground placeholder-slate-400 transition-all focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm"
                placeholder="Tối thiểu 6 ký tự"
                disabled={tokenMissing}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute inset-y-0 right-0 flex items-center rounded-r-xl pr-3 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/50"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {password.length > 0 && (
              <p
                aria-live="polite"
                className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
                  passwordValid ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                }`}
              >
                {passwordValid && <Check className="h-3.5 w-3.5" />}
                {passwordValid ? "Độ dài mật khẩu hợp lệ" : "Cần tối thiểu 6 ký tự"}
              </p>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground"
            >
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-xl border border-border bg-muted py-3 pl-10 pr-11 text-foreground placeholder-slate-400 transition-all focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm"
                placeholder="Nhập lại mật khẩu mới"
                disabled={tokenMissing}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute inset-y-0 right-0 flex items-center rounded-r-xl pr-3 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/50"
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <p
                aria-live="polite"
                className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
                  passwordsMatch ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                }`}
              >
                {passwordsMatch ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {passwordsMatch ? "Mật khẩu khớp" : "Mật khẩu chưa khớp"}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || tokenMissing}
          className="group relative flex w-full justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-cyan-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Đang kích hoạt..." : "Kích hoạt & Lưu thông tin"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground lg:text-left">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-bold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300">
          Đăng nhập
        </Link>
      </p>
    </div>
  )
}

export default function ActivatePage() {
  return (
    <div className="flex min-h-dvh bg-background">
      <AuthBrandPanel />

      {/* Form panel */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <ThemeToggle className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted" />

        <Suspense
          fallback={
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-cyan-600 border-t-transparent animate-spin" />
          }
        >
          <ActivateContent />
        </Suspense>
      </div>
    </div>
  )
}
