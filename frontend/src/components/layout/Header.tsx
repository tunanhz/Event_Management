"use client"

import { Bell, Search, ChevronDown, Menu } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useAuth()

  const getInitials = (name: string) => {
    if (!name) return "?"
    return name.charAt(0).toUpperCase()
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Quản trị viên"
      case "ORGANIZER":
        return "Người tổ chức"
      case "STAFF":
        return "Nhân viên"
      case "PARTICIPANT":
        return "Người tham gia"
      default:
        return "Thành viên"
    }
  }

  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Menu toggle (mobile) + Search */}
      <div className="flex flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Mở menu điều hướng"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-cyan-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative w-full max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: "var(--muted-foreground)" }}
          />
          <input
            type="search"
            placeholder="Tìm kiếm sự kiện, người tham dự..."
            aria-label="Tìm kiếm sự kiện, người tham dự"
            className="h-9 w-full rounded-xl border pl-9 pr-4 text-sm outline-none transition-all focus:ring-2"
            style={{
              background: "var(--muted)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <ThemeToggle className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-cyan-50" />

        {/* Notification bell */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-cyan-50"
          aria-label="Thông báo"
        >
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          <span
            className="absolute right-2 top-2 flex h-2 w-2 rounded-full"
            style={{ background: "var(--destructive)" }}
          />
        </button>

        {/* Divider */}
        <div className="h-6 w-px" style={{ background: "var(--border)" }} />

        {/* User */}
        {user && (
          <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-cyan-50">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.fullName}
                className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}
              >
                {getInitials(user.fullName)}
              </div>
            )}
            <div className="hidden text-left md:block">
              <p className="text-sm font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                {user.fullName}
              </p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {getRoleLabel(user.role)}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 hidden md:block text-muted-foreground" />
          </button>
        )}
      </div>
    </header>
  )
}
