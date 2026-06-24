"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Ticket,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { name: "Sự kiện", href: "/dashboard/events", icon: CalendarDays },
  { name: "Người tham dự", href: "/dashboard/attendees", icon: Users },
  { name: "Vé & Bán hàng", href: "/dashboard/ticketing", icon: Ticket },
  { name: "Cài đặt", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div
      className="flex h-full w-64 flex-col border-r bg-white px-4 py-5"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-sm"
        >
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold leading-tight" style={{ color: "var(--foreground)" }}>
            EventBox
          </h1>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Quản lý sự kiện
          </p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex flex-1 flex-col justify-between">
        <nav className="space-y-1">
          <p
            className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            Menu chính
          </p>
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname?.startsWith(`${item.href}/`) && item.href !== "/dashboard")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "gradient-primary text-white shadow-sm"
                    : "text-gray-600 hover:bg-violet-50 hover:text-violet-700"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-4.5 w-4.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-white" : "text-gray-400 group-hover:text-violet-600"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="space-y-2">
          <div
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: "var(--muted)" }}
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
            >
              A
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                Admin
              </p>
              <p className="truncate text-xs" style={{ color: "var(--muted-foreground)" }}>
                admin@eventbox.vn
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Link>
        </div>
      </div>
    </div>
  )
}
