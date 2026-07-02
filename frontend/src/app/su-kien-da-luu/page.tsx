import type { Metadata } from "next"
import Header from "@/components/home/Header"
import Footer from "@/components/home/Footer"
import MobileBottomNav from "@/components/home/MobileBottomNav"
import { SavedEventsView } from "@/components/saved/SavedEventsView"
import styles from "./page.module.css"

export const metadata: Metadata = {
  title: "Sự kiện đã lưu | EventBox",
  description:
    "Danh sách các sự kiện bạn đã lưu trên EventBox để xem lại và đặt vé sau.",
}

/**
 * "Sự kiện đã lưu" (Saved events) page — /su-kien-da-luu.
 * Shares the public site shell; saved events are stored client-side
 * (see use-saved-events.ts).
 */
export default function SavedEventsPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <SavedEventsView />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  )
}
