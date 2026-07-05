"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ScanLine, CalendarDays, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { AccountMenuDropdown } from "@/components/account/AccountMenuDropdown"
import { useAuth } from "@/context/AuthContext"

/** Top-level staff sections. "Sự kiện" also covers the per-event check-in routes. */
const NAV_ITEMS = [
  {
    name: "Sự kiện",
    href: "/staff",
    icon: CalendarDays,
    isActive: (path: string) => path === "/staff" || path.startsWith("/staff/check-in"),
  },
  {
    name: "Sự cố",
    href: "/staff/incidents",
    icon: TriangleAlert,
    isActive: (path: string) => path.startsWith("/staff/incidents"),
  },
]

/** Refined top bar for the staff area: brand, section nav, live status, account. */
export function StaffTopbar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const name = user?.fullName ?? "Nhân viên"
  const initial = name.charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-500 text-white shadow-sm shadow-primary/30"
            aria-hidden="true"
          >
            <ScanLine size={20} />
          </span>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-foreground">EventBox</span>
              <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-primary">
                Staff
              </span>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Trạm soát vé &amp; check-in
            </span>
          </div>
        </div>

        {/* Section nav */}
        <nav aria-label="Khu vực nhân viên" className="ml-1 flex items-center gap-1 sm:ml-3">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="hidden sm:inline">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* Live station status */}
        <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 md:inline-flex">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Trực tuyến
        </span>

        {/* Light/dark theme toggle */}
        <ThemeToggle className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" />

        {/* Account chip — dropdown with profile link + logout */}
        <AccountMenuDropdown
          profileHref="/staff/profile"
          triggerClassName="flex items-center gap-2.5 rounded-full border border-border bg-background/60 py-1 pl-1.5 pr-2.5 text-foreground transition-colors hover:bg-muted"
        >
          <span
            className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary"
            aria-hidden="true"
          >
            {initial}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-semibold text-foreground">{name}</span>
            <span className="block text-[0.7rem] text-muted-foreground">Nhân viên soát vé</span>
          </span>
        </AccountMenuDropdown>
      </div>
    </header>
  )
}
