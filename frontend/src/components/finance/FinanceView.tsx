"use client"

import { PayoutRefundTable } from "./PayoutRefundTable"

/**
 * Admin Finance & Payout Console:
 * Inspect organizer payout/withdrawal requests, audit ticket sales revenue,
 * check initial signed contracts & bank details, and execute or reject payout requests.
 */
export function FinanceView() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Quản lý Giải ngân & Rút tiền</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Xem xét các yêu cầu rút tiền do Ban tổ chức gửi lên sau sự kiện. Kiểm tra bao quát số lượng vé bán được, doanh thu, hợp đồng đã ký và thông tin ngân hàng trước khi duyệt.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <PayoutRefundTable />
      </div>
    </div>
  )
}
