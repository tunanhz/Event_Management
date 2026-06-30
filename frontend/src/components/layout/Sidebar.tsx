"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Settings,
  LogOut,
  Sparkles,
  ShieldCheck,
  Ticket,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Generate dynamic navigation items based on user role
  const navigation = [
    { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
    { name: "Sự kiện", href: "/dashboard/events", icon: CalendarDays },
    { name: "Vé & Bán hàng", href: "/dashboard/ticketing", icon: Ticket },
  ]

  // Only admins can access account management
  if (user?.role === "ADMIN") {
    navigation.push({ name: "Quản lý tài khoản", href: "/dashboard/accounts", icon: ShieldCheck })
  }

  navigation.push({ name: "Cài đặt", href: "/dashboard/settings", icon: Settings })

  const getInitials = (name: string) => {
    if (!name) return "?"
    return name.charAt(0).toUpperCase()
  }

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    logout()
  }

  return (
    <div
      className="flex h-full w-64 flex-col border-r bg-card px-4 py-5"
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
                onClick={onNavigate}
                className={cn(
                  "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "gradient-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-cyan-50 hover:text-cyan-700"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-4.5 w-4.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-white" : "text-muted-foreground group-hover:text-cyan-600"
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
          {user && (
            <div
              className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: "var(--muted)" }}
            >
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
              <div className="overflow-hidden">
                <p className="truncate text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                  {user.fullName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.role}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  )
}
