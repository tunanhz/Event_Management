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

  return (
    <WithdrawalRequestView
      availableBalance={getAvailableBalance(id)}
      history={getWithdrawalHistory(id)}
    />
  )
}
