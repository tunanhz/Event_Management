"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ContractReviewTable } from "./ContractReviewTable"
import { PayoutRefundTable } from "./PayoutRefundTable"

const TABS = [
  { id: "contracts", label: "Đối soát hợp đồng" },
  { id: "payouts", label: "Payout / Refund" },
] as const

type TabId = (typeof TABS)[number]["id"]

/**
 * Admin finance console: contract review (SLA compliance after an event
 * completes) and payout/refund execution. Contract "Đạt chuẩn" is the gate
 * before approving the organizer's payout.
 */
export function FinanceView() {
  const [tab, setTab] = useState<TabId>("contracts")

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Tài chính</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Đối soát hợp đồng sau sự kiện và thực hiện giải ngân cho Ban tổ chức / hoàn tiền người mua.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer",
              tab === t.id
                ? "bg-cyan-600 text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {tab === "contracts" ? <ContractReviewTable /> : <PayoutRefundTable />}
      </div>
    </div>
  )
}
