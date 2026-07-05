"use client"

import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { useAuth, type User } from "@/context/AuthContext"

type Role = User["role"]

interface RoleGuardProps {
  /** Roles permitted to view the children. Anyone else sees the denied screen. */
  allow: Role[]
  children: React.ReactNode
  /** Heading on the access-denied screen. */
  title?: string
  /** Explanation shown on the access-denied screen. */
  message?: string
}

/**
 * Client-side route guard for role-restricted areas.
 *
 * While the auth check is in flight it shows a spinner; once resolved it renders
 * the children only for allowed roles, otherwise an access-denied screen with an
 * escape route back home. Unauthenticated visitors are treated as not allowed.
 */
export function RoleGuard({ allow, children, title, message }: RoleGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        className="flex h-dvh items-center justify-center"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-cyan-600" />
      </div>
    )
  }

  if (!user || !allow.includes(user.role)) {
    return (
      <div
        className="flex h-dvh flex-col items-center justify-center gap-3 px-4 text-center"
        style={{ backgroundColor: "var(--background)" }}
      >
        <ShieldAlert className="h-16 w-16 text-rose-500" />
        <h1 className="text-xl font-bold text-foreground">
          {title ?? "Quyền truy cập bị từ chối"}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {message ?? "Bạn không có quyền truy cập khu vực này."}
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

  return <>{children}</>
}
