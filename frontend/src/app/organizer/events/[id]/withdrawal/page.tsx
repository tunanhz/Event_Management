"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { WithdrawalRequestView } from "@/components/organizer/manage/WithdrawalRequestView"

/** Withdrawal ("Rút tiền"): real balance + request history from the API. */
export default function EventWithdrawalPage() {
  const { event, detail } = useWorkspaceEvent()
  return (
    <WithdrawalRequestView eventId={event.id} defaultPaymentInfo={detail.event.paymentInfo} />
  )
}
