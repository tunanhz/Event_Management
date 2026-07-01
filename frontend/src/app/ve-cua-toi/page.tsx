import type { Metadata } from "next"
import Header from "@/components/home/Header"
import Footer from "@/components/home/Footer"
import MobileBottomNav from "@/components/home/MobileBottomNav"
import { MyTicketsView } from "@/components/tickets/MyTicketsView"
import styles from "./page.module.css"

export const metadata: Metadata = {
  title: "Vé của tôi | EventBox",
  description:
    "Quản lý vé điện tử của bạn trên EventBox — xem vé sắp diễn ra, vé đã sử dụng và lịch sử đặt vé.",
}

/**
 * "Vé của tôi" (My Tickets) page — /ve-cua-toi.
 * Shared site shell (header + footer + bottom nav) wrapping the interactive
 * ticket list. Ticket data is mock for now (see tickets-data.ts).
 */
export default function MyTicketsPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <MyTicketsView />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  )
}
