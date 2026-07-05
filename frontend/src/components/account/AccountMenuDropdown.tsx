"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { ChevronDown, LogOut, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"

interface AccountMenuDropdownProps {
  /** Destination of the "Thông tin cá nhân" item (differs per area). */
  profileHref: string
  /** Classes for the trigger button — each area keeps its own chip style. */
  triggerClassName?: string
  /** Trigger chip content (avatar, name…); the chevron is appended automatically. */
  children: ReactNode
}

/**
 * Shared account dropdown for area topbars (organizer, staff…): the caller
 * styles its own trigger chip; the menu shows name/email, a profile link and
 * logout. Closes on outside click / Escape.
 */
export function AccountMenuDropdown({
  profileHref,
  triggerClassName,
  children,
}: AccountMenuDropdownProps) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản ${user?.fullName ?? ""}`}
        className={triggerClassName}
      >
        {children}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 rounded-xl border border-border bg-card p-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <div className="truncate text-sm font-semibold text-foreground">{user?.fullName}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
          </div>

          <div className="my-1 h-px bg-border" aria-hidden="true" />

          <Link
            href={profileHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <UserRound size={16} aria-hidden="true" />
            Thông tin cá nhân
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void logout()
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut size={16} aria-hidden="true" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}
