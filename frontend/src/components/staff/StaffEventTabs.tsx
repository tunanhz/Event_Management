"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, ScanLine, Users, History, ClipboardCheck } from "lucide-react"
import { cn } from "@/lib/utils"

/** Sub-routes of the per-event check-in workspace (/staff/check-in/[eventId]). */
const TABS = [
  { key: "", name: "Quét vé", icon: ScanLine },
  { key: "/attendees", name: "Người tham dự", icon: Users },
  { key: "/history", name: "Lịch sử", icon: History },
  { key: "/summary", name: "Ca trực", icon: ClipboardCheck },
]

/** Back link + tab navigation shown above every screen of one event's station. */
export function StaffEventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname()
  const base = `/staff/check-in/${eventId}`

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <Link
        href="/staff"
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Sự kiện của tôi</span>
        <span className="sm:hidden">Quay lại</span>
      </Link>

      <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />

      <nav
        aria-label="Điều hướng trạm check-in"
        className="flex max-w-full items-center gap-1.5 overflow-x-auto"
      >
        {TABS.map((tab) => {
          const href = `${base}${tab.key}`
          const active = tab.key === "" ? pathname === base : pathname.startsWith(href)
          const Icon = tab.icon
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={16} aria-hidden="true" />
              {tab.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
