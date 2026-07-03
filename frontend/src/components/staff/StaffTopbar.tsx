"use client"

import { ScanLine, LogOut } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

/** Refined top bar for the staff check-in station: brand, live status, account. */
export function StaffTopbar() {
  const { user, logout } = useAuth()
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

        <div className="flex-1" />

        {/* Live station status */}
        <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 md:inline-flex">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Trực tuyến
        </span>

        {/* Account chip */}
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-background/60 py-1 pl-1.5 pr-1.5">
          <span
            className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary"
            aria-hidden="true"
          >
            {initial}
          </span>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-semibold text-foreground">{name}</div>
            <div className="text-[0.7rem] text-muted-foreground">Nhân viên soát vé</div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
