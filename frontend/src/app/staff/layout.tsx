import { RoleGuard } from "@/components/auth/RoleGuard"
import { StaffTopbar } from "@/components/staff/StaffTopbar"

/**
 * Staff area shell. Guards to STAFF (ADMIN allowed for oversight) and wraps the
 * check-in station in a focused top-bar layout — not the admin sidebar.
 */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      allow={["STAFF", "ADMIN"]}
      message="Khu vực soát vé chỉ dành cho tài khoản Nhân viên (STAFF)."
    >
      <div className="min-h-dvh bg-background">
        <StaffTopbar />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </RoleGuard>
  )
}
