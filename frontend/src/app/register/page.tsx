"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { clientApi } from "@/lib/client-api"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel"
import { Ticket, Sparkles, Mail, Lock, User as UserIcon, AlertCircle, KeyRound, Eye, EyeOff, Phone, CheckCircle2, XCircle } from "lucide-react"

// ─── helpers ────────────────────────────────────────────────────────────────

/** Validate Vietnamese phone number (10 digits, starts with 0) */
const isValidVietnamesePhone = (phone: string) =>
  /^(0[3-9]\d{8})$/.test(phone)

/** Password strength: returns 0-4 */
const getPasswordStrength = (pwd: string): number => {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return score
}

const strengthLabel = ["", "Yếu", "Trung bình", "Khá", "Mạnh"]
const strengthColor = [
  "",
  "bg-rose-500",
  "bg-amber-400",
  "bg-yellow-400",
  "bg-emerald-500",
]
const strengthTextColor = [
  "",
  "text-rose-500",
  "text-amber-500",
  "text-yellow-500",
  "text-emerald-600 dark:text-emerald-400",
]

// ────────────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState("PARTICIPANT")
  const [otpCode, setOtpCode] = useState("")

  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)

  // Email already exists banner state
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false)

  // Touch states for inline validation
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)

  const { register } = useAuth()

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // ── derived validation ──
  const phoneError = useMemo(() => {
    if (!phone) return ""                         // optional – ok if empty
    if (!isValidVietnamesePhone(phone))
      return "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)"
    return ""
  }, [phone])

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  const passwordError = useMemo(() => {
    if (!password) return ""
    if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự"
    return ""
  }, [password])

  const confirmError = useMemo(() => {
    if (!confirmPassword) return ""
    if (confirmPassword !== password) return "Mật khẩu nhập lại không khớp"
    return ""
  }, [confirmPassword, password])

  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password

  // ── handlers ──
  const handleSendOTP = async () => {
    if (!email) {
      setError("Vui lòng điền địa chỉ email trước khi nhận OTP")
      document.getElementById("email")?.focus()
      return
    }

    try {
      setOtpLoading(true)
      setError("")
      setSuccessMsg("")
      setEmailAlreadyExists(false)

      const res = await clientApi.post<{ success: boolean; message: string }>("/users/otp/send", { email })

      if (res.success) {
        setOtpSent(true)
        setCountdown(60)
        setSuccessMsg("Mã OTP đã được gửi! Vui lòng kiểm tra hộp thư email của bạn (bao gồm cả mục Spam).")
      }
    } catch (err: any) {
      // Detect email-already-registered error (409)
      const msg: string = err.message || ""
      if (msg.includes("đã được đăng ký") || msg.toLowerCase().includes("already registered")) {
        setEmailAlreadyExists(true)
      } else {
        setError(msg || "Gửi OTP thất bại. Vui lòng kiểm tra lại email.")
      }
    } finally {
      setOtpLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Phone validation (optional but must be valid if filled)
    if (phone && phoneError) {
      setError(phoneError)
      document.getElementById("phone")?.focus()
      return
    }

    if (!fullName || !email || !password || !otpCode) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc và mã OTP")
      const firstEmpty = !fullName ? "fullName" : !email ? "email" : !otpCode ? "otp" : "password"
      document.getElementById(firstEmpty)?.focus()
      return
    }

    if (passwordError) {
      setError(passwordError)
      document.getElementById("password")?.focus()
      return
    }

    if (!confirmPassword) {
      setError("Vui lòng nhập lại mật khẩu để xác nhận")
      document.getElementById("confirmPassword")?.focus()
      return
    }

    if (confirmError) {
      setError(confirmError)
      document.getElementById("confirmPassword")?.focus()
      return
    }

    try {
      setLoading(true)
      setError("")
      setSuccessMsg("")

      await register({
        fullName,
        email,
        password,
        phone,
        role,
        otpCode,
      })
    } catch (err: any) {
      setError(err.message || "Đăng ký thất bại. Vui lòng kiểm tra lại mã OTP hoặc thông tin đăng ký.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <AuthBrandPanel />

      {/* Form panel */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <ThemeToggle className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted" />

        <div className="w-full max-w-md space-y-6">
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
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Tạo tài khoản mới</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Khám phá và tổ chức những sự kiện tuyệt vời
            </p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300"
            >
              <Sparkles className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">

              {/* Name Input */}
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Họ và Tên
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full rounded-xl border border-border bg-muted py-2.5 pl-10 pr-3 text-foreground placeholder-slate-400 focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Số điện thoại <span className="normal-case font-normal text-muted-foreground">(Tùy chọn)</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      // Allow only digits
                      const val = e.target.value.replace(/\D/g, "")
                      setPhone(val)
                    }}
                    onBlur={() => setPhoneTouched(true)}
                    maxLength={10}
                    className={`block w-full rounded-xl border py-2.5 pl-10 pr-10 text-foreground placeholder-slate-400 focus:outline-none focus:ring-2 sm:text-sm transition-all bg-muted focus:bg-card ${
                      phoneTouched && phoneError
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : phoneTouched && phone && !phoneError
                        ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                        : "border-border focus:border-cyan-500 focus:ring-cyan-500/20"
                    }`}
                    placeholder="09xxxxxxxx"
                  />
                  {/* Inline validity icon */}
                  {phoneTouched && phone && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      {phoneError
                        ? <XCircle className="h-4 w-4 text-rose-500" />
                        : <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      }
                    </div>
                  )}
                </div>
                {phoneTouched && phoneError && (
                  <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {phoneError}
                  </p>
                )}
              </div>

              {/* Email Input + Send OTP Button */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Địa chỉ Email
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (emailAlreadyExists) setEmailAlreadyExists(false)
                      }}
                      className={`block w-full rounded-xl border py-2.5 pl-10 pr-3 text-foreground placeholder-slate-400 focus:outline-none focus:ring-2 sm:text-sm transition-all bg-muted focus:bg-card ${
                        emailAlreadyExists
                          ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
                          : "border-border focus:border-cyan-500 focus:ring-cyan-500/20"
                      }`}
                      placeholder="name@example.com"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={otpLoading || countdown > 0}
                    className="rounded-xl border border-border bg-muted hover:bg-border text-foreground px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0 min-w-[90px]"
                  >
                    {otpLoading ? "Đang gửi..." : countdown > 0 ? `${countdown}s` : "Gửi OTP"}
                  </button>
                </div>

                {/* Email already exists warning */}
                {emailAlreadyExists && (
                  <div
                    role="alert"
                    className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/50 dark:text-amber-300"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      Email này đã được đăng ký.{" "}
                      <Link href="/login" className="font-bold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200">
                        Đăng nhập ngay
                      </Link>
                      {" "}hoặc dùng email khác.
                    </span>
                  </div>
                )}
              </div>

              {/* OTP Code Input */}
              {otpSent && (
                <div className="animate-fade-down">
                  <label htmlFor="otp" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    Mã xác thực OTP (6 chữ số)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <KeyRound className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="block w-full rounded-xl border border-border bg-muted py-2.5 pl-10 pr-3 text-foreground placeholder-slate-400 focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm tracking-[5px] font-bold text-center transition-all"
                      placeholder="123456"
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Mật khẩu
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
                    onBlur={() => setPasswordTouched(true)}
                    className={`block w-full rounded-xl border py-2.5 pl-10 pr-11 text-foreground placeholder-slate-400 focus:outline-none focus:ring-2 sm:text-sm transition-all bg-muted focus:bg-card ${
                      passwordTouched && passwordError
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-border focus:border-cyan-500 focus:ring-cyan-500/20"
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength >= i ? strengthColor[passwordStrength] : "bg-muted-foreground/20"
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${strengthTextColor[passwordStrength]}`}>
                      Độ mạnh: {strengthLabel[passwordStrength]}
                    </p>
                  </div>
                )}

                {passwordTouched && passwordError && (
                  <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {passwordError}
                  </p>
                )}

                {/* Password requirements hint */}
                {!passwordError && password.length > 0 && passwordStrength < 4 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gợi ý: thêm chữ hoa, số và ký tự đặc biệt để tăng độ mạnh
                  </p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Nhập lại mật khẩu
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setConfirmTouched(true)}
                    className={`block w-full rounded-xl border py-2.5 pl-10 pr-11 text-foreground placeholder-slate-400 focus:outline-none focus:ring-2 sm:text-sm transition-all bg-muted focus:bg-card ${
                      confirmTouched && confirmError
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : passwordsMatch
                        ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                        : "border-border focus:border-cyan-500 focus:ring-cyan-500/20"
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {confirmTouched && confirmError && (
                  <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {confirmError}
                  </p>
                )}
                {passwordsMatch && (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                    Mật khẩu khớp nhau
                  </p>
                )}
              </div>

              {/* Role Selector Cards */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  Bạn muốn tham gia với vai trò nào?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("PARTICIPANT")}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                      role === "PARTICIPANT"
                        ? "border-cyan-600 bg-cyan-50/50 text-cyan-900 ring-2 ring-cyan-500/20 font-semibold dark:bg-cyan-500/10 dark:text-cyan-100 dark:border-cyan-500"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full mb-2 ${
                      role === "PARTICIPANT" ? "bg-cyan-600 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-bold block">Người tham gia</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Mua vé, tham gia sự kiện</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("ORGANIZER")}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                      role === "ORGANIZER"
                        ? "border-cyan-600 bg-cyan-50/50 text-cyan-900 ring-2 ring-cyan-500/20 font-semibold dark:bg-cyan-500/10 dark:text-cyan-100 dark:border-cyan-500"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full mb-2 ${
                      role === "ORGANIZER" ? "bg-cyan-600 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold block">Nhà tổ chức</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Tạo và quản lý sự kiện</span>
                  </button>
                </div>
              </div>

            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !otpSent}
                className="group relative flex w-full justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 transition-all cursor-pointer shadow-md hover:shadow-lg"
              >
                {loading ? "Đang xử lý..." : !otpSent ? "Vui lòng nhận mã OTP trước" : "Đăng ký ngay"}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-bold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
