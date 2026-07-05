import type { Metadata } from "next"
import Header from "@/components/home/Header"
import Footer from "@/components/home/Footer"
import MobileBottomNav from "@/components/home/MobileBottomNav"
import { AccountSettingsView } from "@/components/account/AccountSettingsView"

export const metadata: Metadata = {
  title: "Thông tin cá nhân | EventBox",
  description:
    "Cập nhật thông tin cá nhân và mật khẩu tài khoản EventBox của bạn.",
}

/**
 * "Thông tin cá nhân" (Account settings) page — /tai-khoan.
 * Shared site shell wrapping the interactive account settings view.
 */
export default function AccountPage() {
  return (
    <>
      <Header />
      <main className="min-h-dvh bg-background">
        <AccountSettingsView />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  )
}
