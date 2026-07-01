"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { clientApi } from "@/lib/client-api"
import { Sparkles, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react"

function ActivateContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get("token")

  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

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
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl text-center animate-fade-in">
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100 shadow-inner">
            <CheckCircle2 className="h-8 w-8 animate-bounce" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Kích hoạt thành công!
          </h2>
          <p className="mt-3 text-sm text-slate-600 px-2 leading-relaxed">
            Tài khoản nhân viên của bạn đã được kích hoạt thành công. Mật khẩu mới đã được cập nhật vào hệ thống.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => router.push("/login")}
            className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-700 transition-all cursor-pointer shadow-md hover:shadow-lg"
          >
            Đăng nhập hệ thống
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl animate-fade-in">
      {/* Header Logo */}
      <div className="flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 shadow-md">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Kích hoạt tài khoản
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Vui lòng cập nhật thông tin và mật khẩu mới cho tài khoản Staff
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 border border-rose-100 animate-shake">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* FullName Input */}
          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Họ và Tên của bạn
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <UserIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"
                placeholder="Nhập họ và tên đầy đủ"
                disabled={!!error && !token}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Mật khẩu mới
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"
                placeholder="Tối thiểu 6 ký tự"
                disabled={!!error && !token}
              />
            </div>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"
                placeholder="Nhập lại mật khẩu mới"
                disabled={!!error && !token}
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || (!!error && !token)}
            className="group relative flex w-full justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 transition-all cursor-pointer shadow-md hover:shadow-lg"
          >
            {loading ? "Đang kích hoạt..." : "Kích hoạt & Lưu thông tin"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function ActivatePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-cyan-600 border-t-transparent animate-spin"></div>
      }>
        <ActivateContent />
      </Suspense>
    </div>
  )
}
