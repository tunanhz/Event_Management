"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { clientApi } from "@/lib/client-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { User, Lock, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react"

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()

  const [fullName, setFullName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (user) {
      setFullName(user.fullName)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!fullName.trim()) {
      setError("Họ và tên không được để trống")
      return
    }

    if (newPassword) {
      if (!currentPassword) {
        setError("Vui lòng nhập mật khẩu hiện tại để thay đổi mật khẩu")
        return
      }
      if (newPassword.length < 6) {
        setError("Mật khẩu mới phải từ 6 ký tự trở lên")
        return
      }
      if (newPassword !== confirmPassword) {
        setError("Xác nhận mật khẩu mới không trùng khớp")
        return
      }
    }

    try {
      setLoading(true)
      const res = await clientApi.put<{ success: boolean; message: string }>("/users/me", {
        fullName: fullName.trim(),
        currentPassword: newPassword ? currentPassword : undefined,
        newPassword: newPassword ? newPassword : undefined,
      })

      if (res.success) {
        setSuccess("Cập nhật thông tin tài khoản thành công!")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        await refreshUser()
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi cập nhật thông tin")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Cài đặt tài khoản
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cập nhật thông tin cá nhân và quản lý mật khẩu tài khoản của bạn.
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-700 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700 shadow-sm animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border card-glow" style={{ borderColor: "var(--border)" }}>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-cyan-600" />
            Thông tin cá nhân
          </CardTitle>
          <CardDescription>
            Tên hiển thị và vai trò của bạn trên hệ thống.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Email (disabled) */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Địa chỉ Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="block w-full rounded-xl border border-border bg-muted/60 py-2.5 px-3.5 text-sm text-muted-foreground cursor-not-allowed outline-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                Email tài khoản được cố định và không thể thay đổi.
              </p>
            </div>

            {/* Display Role (disabled) */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Quyền hạn tài khoản
              </label>
              <span className="inline-flex rounded-full bg-cyan-50 border border-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">
                {user?.role}
              </span>
            </div>

            {/* Fullname Input */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                Họ và Tên
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full rounded-xl border border-border bg-muted py-2.5 px-3.5 text-sm text-foreground focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                placeholder="Nhập họ và tên của bạn"
              />
            </div>

            {/* Password Change Divider */}
            <div className="h-px bg-border my-6" />

            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <Lock className="h-4.5 w-4.5 text-cyan-600" />
                Thay đổi mật khẩu
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Nếu không muốn đổi mật khẩu, vui lòng bỏ trống các trường bên dưới.
              </p>

              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <label htmlFor="currentPassword" className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full rounded-xl border border-border bg-muted py-2.5 px-3.5 text-sm text-foreground focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="Nhập mật khẩu đang sử dụng"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                    Mật khẩu mới (Tối thiểu 6 ký tự)
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-xl border border-border bg-muted py-2.5 px-3.5 text-sm text-foreground focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="Nhập mật khẩu mới"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-xl border border-border bg-muted py-2.5 px-3.5 text-sm text-foreground focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
