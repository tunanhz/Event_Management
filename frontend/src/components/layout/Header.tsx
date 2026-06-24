"use client"

import { Bell, Search, ChevronDown } from "lucide-react"

export function Header() {
  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-6"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Search */}
      <div className="flex flex-1 items-center">
        <div className="relative w-full max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: "var(--muted-foreground)" }}
          />
          <input
            type="search"
            placeholder="Tìm kiếm sự kiện, người tham dự..."
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
        {/* Notification bell */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-violet-50"
          aria-label="Thông báo"
        >
          <Bell className="h-4.5 w-4.5 text-gray-500" />
          <span
            className="absolute right-2 top-2 flex h-2 w-2 rounded-full"
            style={{ background: "var(--destructive)" }}
          />
        </button>

        {/* Divider */}
        <div className="h-6 w-px" style={{ background: "var(--border)" }} />

        {/* User */}
        <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-violet-50">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
          >
            A
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
              Quản trị viên
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              admin@eventbox.vn
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 hidden md:block text-gray-400" />
        </button>
      </div>
    </header>
  )
}
