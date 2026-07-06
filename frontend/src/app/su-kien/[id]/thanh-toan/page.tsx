import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Header from "@/components/home/Header"
import { PaymentView } from "@/components/booking/PaymentView"
import { fetchEventDetail } from "@/lib/discovery-api"
import { parseQuantities, totalQuantity } from "@/lib/booking-selection"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const detail = await fetchEventDetail(id)
  return { title: detail ? `Thanh toán — ${detail.event.title} | EventBox` : "Thanh toán | EventBox" }
}

/** Booking step 2 — /su-kien/[id]/thanh-toan?<ticketId>=<qty> */
export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const detail = await fetchEventDetail(id)
  if (!detail) notFound()

  const quantities = parseQuantities(detail.tickets, sp)

  // No tickets selected → send back to the selection step.
  if (totalQuantity(quantities) === 0) redirect(`/su-kien/${id}/dat-ve`)

  return (
    <>
      <Header />
      <PaymentView event={detail.event} tickets={detail.tickets} quantities={quantities} />
    </>
  )
}
