import { notFound } from "next/navigation"
import { getOrganizerEventById } from "@/components/organizer/my-events-data"
import {
  getAvailableBalance,
  getWithdrawalHistory,
} from "@/components/organizer/manage/withdrawal-request-data"
import { WithdrawalRequestView } from "@/components/organizer/manage/WithdrawalRequestView"

/** Withdrawal ("Rút tiền"): banking form + request history for the event. */
export default async function EventWithdrawalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = getOrganizerEventById(id)
  if (!event) notFound()

  return (
    <WithdrawalRequestView
      availableBalance={getAvailableBalance(id)}
      history={getWithdrawalHistory(id)}
    />
  )
}
