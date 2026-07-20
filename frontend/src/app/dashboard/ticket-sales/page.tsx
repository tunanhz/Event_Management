import type { Metadata } from "next"
import { TicketSalesView } from "@/components/ticket-sales/TicketSalesView"

export const metadata: Metadata = {
  title: "Theo dõi bán vé | EventBox",
  description: "Theo dõi số lượng vé bán và doanh thu theo sự kiện.",
}

/** Admin ticket-sales monitoring — /dashboard/ticket-sales. */
export default function TicketSalesPage() {
  return <TicketSalesView />
}
