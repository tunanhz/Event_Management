"use client"

import { Suspense, useState, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, Ticket } from "lucide-react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel"

const INPUT_CLASS =
  "block w-full rounded-xl border border-border bg-muted py-3 pl-10 pr-3 text-foreground placeholder-slate-400 focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"

/**
 * Forgot-password — /forgot-password.
 * Without ?token: email form that "sends" a reset link (mock — backend
 * endpoint does not exist yet). With ?token: set-new-password form, mirroring
 * the staff /activate flow so wiring the real API later is a drop-in.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh bg-background">
      <AuthBrandPanel />

      <div className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <ThemeToggle className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted" />

        <div className="w-full max-w-md space-y-8">
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

          <Suspense fallback={null}>
            <ForgotPasswordFlow />
          </Suspense>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 font-bold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function ForgotPasswordFlow() {
  const token = useSearchParams().get("token")
  return token ? <ResetPasswordForm /> : <RequestLinkForm />
}

/** Step 1 — request a reset link by email. */
function RequestLinkForm() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    // Mock send — no backend endpoint yet. Always report success so the form
    // does not reveal whether an email exists (anti-enumeration).
    window.setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 700)
  }

  if (sent) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-500/10 p-6 text-center"
      >
        <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        <p className="font-bold text-foreground">Đã gửi hướng dẫn khôi phục</p>
        <p className="text-sm text-muted-foreground">
          Nếu <span className="font-semibold text-foreground">{email}</span> tồn tại trong hệ thống,
          bạn sẽ nhận được email chứa liên kết đặt lại mật khẩu trong ít phút. Hãy kiểm tra cả hộp thư spam.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="text-center lg:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Quên mật khẩu</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nhập email đã đăng ký — chúng tôi sẽ gửi liên kết để bạn đặt lại mật khẩu.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email-address" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground">
            Địa chỉ Email
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              id="email-address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
              placeholder="name@example.com"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="flex w-full justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-cyan-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Đang gửi..." : "Gửi liên kết khôi phục"}
        </button>
      </form>
    </>
  )
}

/** Step 2 — set a new password (arrived via emailed ?token link). */
function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.")
      return
    }
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.")
      return
    }
    setError("")
    // Mock reset — real flow will POST the token + new password to backend.
    setDone(true)
  }

  if (done) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-500/10 p-6 text-center"
      >
        <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        <p className="font-bold text-foreground">Đặt lại mật khẩu thành công</p>
        <p className="text-sm text-muted-foreground">
          Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
        </p>
        <Link
          href="/login"
          className="mt-1 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cyan-700"
        >
          Đăng nhập
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="text-center lg:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Đặt mật khẩu mới</h2>
        <p className="mt-2 text-sm text-muted-foreground">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground">
              Mật khẩu mới
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                id="new-password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT_CLASS} pr-11`}
                placeholder="Ít nhất 8 ký tự"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground">
              Nhập lại mật khẩu
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                id="confirm-password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={INPUT_CLASS}
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!password || !confirm}
          className="flex w-full justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-cyan-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 cursor-pointer"
        >
          Đặt lại mật khẩu
        </button>
      </form>
    </>
  )
}
