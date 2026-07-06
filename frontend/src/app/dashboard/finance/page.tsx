import type { Metadata } from "next"
import { FinanceView } from "@/components/finance/FinanceView"

export const metadata: Metadata = {
  title: "Tài chính | EventBox",
  description: "Đối soát hợp đồng sau sự kiện và thực hiện payout/refund.",
}

/** Admin finance console — /dashboard/finance. */
export default function FinancePage() {
  return <FinanceView />
}
