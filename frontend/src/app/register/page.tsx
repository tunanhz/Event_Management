"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { clientApi } from "@/lib/client-api"
import { Sparkles, Mail, Lock, User as UserIcon, AlertCircle, ShieldAlert, KeyRound } from "lucide-react"

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("PARTICIPANT")
  const [otpCode, setOtpCode] = useState("")
  
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  
  const { register } = useAuth()

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown]);

  const handleSendOTP = async () => {
    if (!email) {
      setError("Vui lòng điền địa chỉ email trước khi nhận OTP")
      return
    }

    try {
      setOtpLoading(true)
      setError("")
      setSuccessMsg("")

      const res = await clientApi.post<{ success: boolean; message: string }>("/users/otp/send", { email })
      
      if (res.success) {
        setOtpSent(true)
        setCountdown(60) // 1 minute cooldown
        setSuccessMsg("Mã OTP đã được gửi! Vui lòng kiểm tra hộp thư email của bạn (bao gồm cả mục Spam).")
      }
    } catch (err: any) {
      setError(err.message || "Gửi OTP thất bại. Vui lòng kiểm tra lại email.")
    } finally {
      setOtpLoading(false)
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !email || !password || !otpCode) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc và mã OTP")
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
            Tạo tài khoản mới
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Khám phá và tổ chức những sự kiện tuyệt vời
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 border border-rose-100">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-100">
            <Sparkles className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            
            {/* Name Input */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Họ và Tên
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
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Số điện thoại (Tùy chọn)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"
                  placeholder="09xxxxxxxx"
                />
              </div>
            </div>

            {/* Email Input + Send OTP Button */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Địa chỉ Email
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"
                    placeholder="name@example.com"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={otpLoading || countdown > 0}
                  className="rounded-xl border bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700 px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer h-10.5 flex items-center justify-center shrink-0 min-w-[90px]"
                >
                  {otpLoading ? "Đang gửi..." : countdown > 0 ? `${countdown}s` : "Gửi OTP"}
                </button>
              </div>
            </div>

            {/* OTP Code Input */}
            {otpSent && (
              <div className="animate-fade-down">
                <label htmlFor="otp" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Mã xác thực OTP (6 chữ số)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm tracking-[5px] font-bold text-center transition-all"
                    placeholder="123456"
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Role Selector Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Bạn muốn tham gia với vai trò nào?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("PARTICIPANT")}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                    role === "PARTICIPANT"
                      ? "border-cyan-600 bg-cyan-50/50 text-cyan-900 ring-2 ring-cyan-500/20 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full mb-2 ${
                    role === "PARTICIPANT" ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold block">Người tham gia</span>
                  <span className="text-[10px] text-slate-400 mt-1">Mua vé, tham gia sự kiện</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("ORGANIZER")}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                    role === "ORGANIZER"
                      ? "border-cyan-600 bg-cyan-50/50 text-cyan-900 ring-2 ring-cyan-500/20 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full mb-2 ${
                    role === "ORGANIZER" ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold block">Nhà tổ chức</span>
                  <span className="text-[10px] text-slate-400 mt-1">Tạo và quản lý sự kiện</span>
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

        <p className="mt-6 text-center text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-bold text-cyan-600 hover:text-cyan-500">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  )
}
