"use client"

import { useState } from "react"
import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/context/AuthContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading } = useAuth()

  // Gate the entire admin area to ADMIN accounts.
  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-cyan-600" />
      </div>
    )
  }

  if (user?.role !== "ADMIN") {
    return (
      <div
        className="flex h-dvh flex-col items-center justify-center gap-3 px-4 text-center"
        style={{ backgroundColor: "var(--background)" }}
      >
        <ShieldAlert className="h-16 w-16 text-rose-500" />
        <h1 className="text-xl font-bold text-foreground">Quyền truy cập bị từ chối</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Khu vực Quản trị chỉ dành cho tài khoản Quản trị viên (ADMIN).
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cyan-700"
        >
          Về trang chủ
        </Link>
      </div>
    )
  }

  return (
    <div
      className="flex h-dvh overflow-hidden"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full shadow-xl">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
