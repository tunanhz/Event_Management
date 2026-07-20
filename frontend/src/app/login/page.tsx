"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel"
import { Ticket, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react"

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(options: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
      }): void
      renderButton(
        element: HTMLElement,
        options: { theme: string; size: string; width: number; text: string }
      ): void
    }
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login, loginWithGoogle } = useAuth()

  const handleGoogleCredentialResponse = useCallback(async (response: GoogleCredentialResponse) => {
    try {
      setLoading(true)
      setError("")
      await loginWithGoogle(response.credential)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Đăng nhập Google thất bại")
    } finally {
      setLoading(false)
    }
  }, [loginWithGoogle])

  // Dynamic Google script loading
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true;
    script.defer = true;
    document.body.appendChild(script)

    script.onload = () => {
      const g = (window as typeof window & { google?: GoogleIdentityApi }).google;
      if (g) {
        g.accounts.id.initialize({
          client_id: "182516438144-c810a7p012fhgbhmqpgk3bjs3en1om48.apps.googleusercontent.com", // Will fallback in backend if blank
          callback: handleGoogleCredentialResponse,
        });
        const container = document.getElementById("googleSignInBtn")
        if (container) {
          const measuredWidth = Math.floor(container.getBoundingClientRect().width) || 320
          g.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            width: Math.max(200, Math.min(400, measuredWidth)),
            text: "signin_with",
          });
        }
      }
    };

    return () => {
      document.body.removeChild(script)
    };
  }, [handleGoogleCredentialResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu")
      document.getElementById(!email ? "email-address" : "password")?.focus()
      return
    }

    try {
      setLoading(true)
      setError("")
      await login(email, password)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.")
    } finally {
      setLoading(false)
    }
  };

  return (
    <div className="flex min-h-dvh bg-background">
      <AuthBrandPanel />

      {/* Form panel */}
      <div className="relative flex min-w-0 flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <ThemeToggle className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted" />

        <div className="w-full max-w-md space-y-6 sm:space-y-8">
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
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Đăng nhập</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Đăng nhập vào tài khoản EventBox của bạn
            </p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 border border-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300 animate-shake"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-border bg-muted py-3 pl-10 pr-3 text-foreground placeholder-slate-400 focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

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
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-border bg-muted py-3 pl-10 pr-11 text-foreground placeholder-slate-400 focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"
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
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 text-sm min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground">
                  Ghi nhớ đăng nhập
                </label>
              </div>
              <Link
                href="/forgot-password"
                className="font-medium text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 transition-all cursor-pointer shadow-md hover:shadow-lg"
              >
                {loading ? "Đang xử lý..." : "Đăng nhập"}
              </button>
            </div>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <span className="relative bg-background px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Hoặc tiếp tục với
            </span>
          </div>

          {/* Google Sign In Container */}
          <div className="space-y-3">
            <div id="googleSignInBtn" className="flex min-h-[40px] w-full min-w-0 justify-center overflow-hidden text-center"></div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="font-bold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
