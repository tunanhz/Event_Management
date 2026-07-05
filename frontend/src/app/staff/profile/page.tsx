import type { Metadata } from "next"
import { AccountSettingsView } from "@/components/account/AccountSettingsView"

export const metadata: Metadata = {
  title: "Thông tin cá nhân | EventBox",
  description: "Nhân viên soát vé cập nhật thông tin cá nhân và mật khẩu tài khoản.",
}

/** Staff profile settings — /staff/profile (reuses the shared account view). */
export default function StaffProfilePage() {
  return <AccountSettingsView />
}
