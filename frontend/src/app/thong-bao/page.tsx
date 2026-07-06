import type { Metadata } from "next"
import Header from "@/components/home/Header"
import Footer from "@/components/home/Footer"
import MobileBottomNav from "@/components/home/MobileBottomNav"
import { NotificationsView } from "@/components/notifications/NotificationsView"
import styles from "./page.module.css"

export const metadata: Metadata = {
  title: "Thông báo | EventBox",
  description:
    "Trung tâm thông báo EventBox — kết quả duyệt sự kiện, xác nhận thanh toán, nhắc lịch và cập nhật hệ thống.",
}

/**
 * Notification centre — /thong-bao.
 * Shared site shell wrapping the interactive notification list (mock feed;
 * read/deleted state persists in localStorage).
 */
export default function NotificationsPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <NotificationsView />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  )
}
