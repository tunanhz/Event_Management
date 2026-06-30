"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { Sparkles, Mail, Lock, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login, loginWithGoogle } = useAuth()

  // Dynamic Google script loading
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true;
    script.defer = true;
    document.body.appendChild(script)

    script.onload = () => {
      const g = (window as any).google;
      if (g) {
        g.accounts.id.initialize({
          client_id: "your-google-client-id.apps.googleusercontent.com", // Will fallback in backend if blank
          callback: handleGoogleCredentialResponse,
        });
        g.accounts.id.renderButton(
          document.getElementById("googleSignInBtn"),
          { theme: "outline", size: "large", width: "100%", text: "signin_with" }
        );
      }
    };

    return () => {
      document.body.removeChild(script)
    };
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    try {
      setLoading(true)
      setError("")
      await loginWithGoogle(response.credential)
    } catch (err: any) {
      setError(err.message || "Đăng nhập Google thất bại")
    } finally {
      setLoading(false)
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu")
      return
    }

    try {
      setLoading(true)
      setError("")
      await login(email, password)
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.")
    } finally {
      setLoading(false)
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 shadow-md">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            Chào mừng trở lại
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Đăng nhập vào tài khoản EventBox của bạn
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 border border-rose-100 animate-shake">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Địa chỉ Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                Ghi nhớ đăng nhập
              </label>
            </div>
            <a href="#" className="font-medium text-cyan-600 hover:text-cyan-500">
              Quên mật khẩu?
            </a>
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

        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <span className="relative bg-white px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Hoặc tiếp tục với
          </span>
        </div>

        {/* Google Sign In Container */}
        <div className="space-y-3">
          <div id="googleSignInBtn" className="w-full min-h-[40px] flex justify-center text-center"></div>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-bold text-cyan-600 hover:text-cyan-500">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  )
}
