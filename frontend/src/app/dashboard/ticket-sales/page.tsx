import type { Metadata } from "next"
import { TicketSalesView } from "@/components/ticket-sales/TicketSalesView"

export const metadata: Metadata = {
  title: "Quản lý bán vé | EventBox",
  description: "Cấu hình phí nền tảng và theo dõi tình hình bán vé theo sự kiện.",
}

/** Admin ticket sale management — /dashboard/ticket-sales. */
export default function TicketSalesPage() {
  return <TicketSalesView />
}
