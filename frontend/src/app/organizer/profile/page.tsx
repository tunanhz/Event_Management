import type { Metadata } from "next"
import { SetOrganizerTitle } from "@/components/organizer/SetOrganizerTitle"
import { AccountSettingsView } from "@/components/account/AccountSettingsView"

export const metadata: Metadata = {
  title: "Thông tin cá nhân | EventBox",
  description: "Nhà tổ chức cập nhật thông tin cá nhân và mật khẩu tài khoản.",
}

/** Organizer profile settings — /organizer/profile (reuses the shared account view). */
export default function OrganizerProfilePage() {
  return (
    <>
      <SetOrganizerTitle title="Thông tin cá nhân" />
      <AccountSettingsView />
    </>
  )
}
